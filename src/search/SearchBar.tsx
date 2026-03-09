import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import Fuse from "fuse.js";
import { useViewerStore } from "../store/viewer-store";
import type { AuthorizationNode } from "../types";

interface SearchItem {
  id: string;
  type: string;
  relation: string;
  kind: AuthorizationNode["kind"];
  isPermission: boolean;
}

const MAX_RESULTS = 20;

const SearchBar = () => {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const nodes = useViewerStore((s) => s.nodes);
  const recentlyVisited = useViewerStore((s) => s.recentlyVisited);
  const setPermissionAnchor = useViewerStore((s) => s.setPermissionAnchor);
  const setRoleAnchor = useViewerStore((s) => s.setRoleAnchor);

  // Build search items — exclude type-only nodes (kind === "type")
  const searchItems = useMemo<SearchItem[]>(
    () =>
      nodes
        .filter((n) => n.kind === "relation")
        .map((n) => ({
          id: n.id,
          type: n.type,
          relation: n.relation ?? "",
          kind: n.kind,
          isPermission: n.isPermission,
        })),
    [nodes],
  );

  const fuse = useMemo(
    () =>
      new Fuse(searchItems, {
        keys: [
          { name: "id", weight: 2 },
          { name: "type", weight: 1.5 },
          { name: "relation", weight: 1.5 },
        ],
        threshold: 0.4,
        includeScore: true,
        minMatchCharLength: 1,
      }),
    [searchItems],
  );

  const results = useMemo<SearchItem[]>(() => {
    if (!query.trim()) {
      // Show recently visited when focused but empty
      return recentlyVisited
        .slice(0, 5)
        .map((id) => searchItems.find((n) => n.id === id))
        .filter((n): n is SearchItem => n != null);
    }
    return fuse
      .search(query)
      .slice(0, MAX_RESULTS)
      .map((r) => r.item);
  }, [query, fuse, recentlyVisited, searchItems]);

  const showDropdown = focused && (query.trim().length > 0 || results.length > 0);

  const safeHighlight = Math.min(highlightIndex, Math.max(0, results.length - 1));

  const handleSelect = useCallback(
    (item: SearchItem) => {
      if (item.isPermission) {
        setPermissionAnchor(item.id);
      } else {
        setRoleAnchor(item.id);
      }
      setQuery("");
      setFocused(false);
      inputRef.current?.blur();
    },
    [setPermissionAnchor, setRoleAnchor],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = results[safeHighlight];
        if (item) handleSelect(item);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setQuery("");
        setFocused(false);
        inputRef.current?.blur();
      }
    },
    [results, safeHighlight, handleSelect],
  );

  // Scroll highlighted item into view
  useEffect(() => {
    if (!showDropdown) return;
    listRef.current
      ?.querySelector("[data-highlighted]")
      ?.scrollIntoView({ block: "nearest" });
  }, [safeHighlight, showDropdown]);

  // Close dropdown on outside click
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (nodes.length === 0) return null;

  return (
    <div ref={containerRef} className="relative z-20 shrink-0">
      {/* Input row */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{
          background: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        {/* Search icon */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          style={{ color: "var(--color-text-muted)", flexShrink: 0 }}
        >
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" />
          <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlightIndex(0);
          }}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search types, roles, permissions..."
          className="search-bar-input flex-1 bg-transparent outline-none text-sm"
          style={{ color: "var(--color-text-secondary)" }}
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setHighlightIndex(0); }}
            className="text-xs px-1.5 py-0.5 rounded cursor-pointer"
            style={{ color: "var(--color-text-muted)", background: "rgba(46,46,46,0.6)" }}
          >
            Clear
          </button>
        )}
        <kbd
          className="text-xs px-1.5 py-0.5 rounded"
          style={{ color: "var(--color-text-muted)", background: "rgba(46,46,46,0.6)" }}
        >
          /
        </kbd>
      </div>

      {/* Results dropdown */}
      {showDropdown && (
        <div
          ref={listRef}
          className="absolute left-0 right-0 top-full max-h-[320px] overflow-y-auto scrollbar-dark"
          style={{
            background: "var(--color-surface-overlay)",
            border: "1px solid var(--color-border)",
            borderTop: "none",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          }}
        >
          {results.length === 0 ? (
            <div
              className="px-3 py-4 text-center text-xs"
              style={{ color: "var(--color-text-muted)" }}
            >
              No matches
            </div>
          ) : (
            <>
              {!query.trim() && (
                <div
                  className="px-3 pt-2 pb-1 text-xs font-medium uppercase tracking-wider"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Recent
                </div>
              )}
              {results.map((item, i) => {
                const isHighlighted = i === safeHighlight;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setHighlightIndex(i)}
                    data-highlighted={isHighlighted ? "" : undefined}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left cursor-pointer transition-colors"
                    style={{
                      background: isHighlighted ? "rgba(212,160,23,0.08)" : "transparent",
                    }}
                  >
                    {/* Kind badge */}
                    <span
                      className="text-xs px-1.5 py-0.5 rounded shrink-0"
                      style={{
                        color: item.isPermission ? "var(--color-dot-permission)" : "var(--color-dot-relation)",
                        background: item.isPermission ? "rgba(85,85,85,0.15)" : "rgba(119,119,119,0.15)",
                      }}
                    >
                      {item.isPermission ? "permission" : "role"}
                    </span>

                    {/* Name */}
                    <span
                      className="text-xs font-medium truncate"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {item.type}#{item.relation}
                    </span>
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
