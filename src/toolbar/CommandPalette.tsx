import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import Fuse from "fuse.js";
import { useViewerStore } from "../store/viewer-store";
import { getTypeColor, blueprint } from "../theme/colors";
import type { AuthorizationNode } from "../types";

/** Shape of items indexed by Fuse */
interface SearchItem {
  id: string;
  type: string;
  relation: string;
  fullId: string;
  kind: AuthorizationNode["kind"];
  isPermission: boolean;
  definition: string;
}

const MAX_RESULTS = 30;

// ─── Row type icons ──────────────────────────────────────────────────────────

/** Small filled circle for relations */
const RelationIcon = ({ color }: { color: string }) => (
  <svg width="10" height="10" viewBox="0 0 10 10" className="shrink-0">
    <circle cx="5" cy="5" r="4" fill={color} />
  </svg>
);

/** Small rotated square (diamond) for permissions */
const PermissionIcon = ({ color }: { color: string }) => (
  <svg width="10" height="10" viewBox="0 0 10 10" className="shrink-0">
    <rect
      x="5"
      y="1"
      width="5.66"
      height="5.66"
      rx="0.8"
      transform="rotate(45 5 1)"
      fill={color}
    />
  </svg>
);

// ─── Inner component — remounted on each open ────────────────────────────────

const CommandPaletteInner = ({ onClose }: { onClose: () => void }) => {
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const nodes = useViewerStore((s) => s.nodes);
  const dimensions = useViewerStore((s) => s.dimensions);
  const recentlyVisited = useViewerStore((s) => s.recentlyVisited);
  const navigateToSubgraph = useViewerStore((s) => s.navigateToSubgraph);
  const setSearchOpen = useViewerStore((s) => s.setSearchOpen);

  // Build search items from all nodes
  const searchItems = useMemo<SearchItem[]>(
    () =>
      nodes.map((n) => ({
        id: n.id,
        type: n.type,
        relation: n.relation ?? "",
        fullId: n.id,
        kind: n.kind,
        isPermission: n.isPermission,
        definition: n.definition ?? "",
      })),
    [nodes],
  );

  // Create Fuse index (memoized)
  const fuse = useMemo(
    () =>
      new Fuse(searchItems, {
        keys: [
          { name: "fullId", weight: 2 },
          { name: "type", weight: 1.5 },
          { name: "relation", weight: 1.5 },
          { name: "definition", weight: 0.5 },
        ],
        threshold: 0.4,
        includeScore: true,
        includeMatches: true,
        minMatchCharLength: 1,
      }),
    [searchItems],
  );

  // Search results: fuzzy when query present, recently visited when empty
  const results = useMemo<SearchItem[]>(() => {
    if (!query.trim()) {
      // Show recently visited when empty (max 5)
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

  // Group results by type card
  const grouped = useMemo(() => {
    const groups = new Map<string, SearchItem[]>();
    for (const item of results) {
      const existing = groups.get(item.type);
      if (existing) existing.push(item);
      else groups.set(item.type, [item]);
    }
    return groups;
  }, [results]);

  // Build flattened list for keyboard navigation index
  const flatList = useMemo(() => {
    const flat: SearchItem[] = [];
    for (const items of grouped.values()) {
      for (const item of items) {
        flat.push(item);
      }
    }
    return flat;
  }, [grouped]);

  // Clamp highlight when results shrink
  const safeHighlight = Math.min(
    highlightIndex,
    Math.max(0, flatList.length - 1),
  );

  // Focus input on mount
  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  // Navigate to subgraph on selection
  const handleSelect = useCallback(
    (item: SearchItem) => {
      if (item.kind === "type") {
        navigateToSubgraph(item.type, "downstream");
      } else if (item.isPermission) {
        navigateToSubgraph(item.id, "upstream");
      } else {
        navigateToSubgraph(item.id, "upstream");
      }
      setSearchOpen(false);
      onClose();
    },
    [navigateToSubgraph, setSearchOpen, onClose],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, flatList.length - 1));
        requestAnimationFrame(() => {
          listRef.current
            ?.querySelector("[data-highlighted]")
            ?.scrollIntoView({ block: "nearest" });
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
        requestAnimationFrame(() => {
          listRef.current
            ?.querySelector("[data-highlighted]")
            ?.scrollIntoView({ block: "nearest" });
        });
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = flatList[safeHighlight];
        if (item) handleSelect(item);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [flatList, safeHighlight, handleSelect, onClose],
  );

  const handleQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value);
      setHighlightIndex(0);
    },
    [],
  );

  // Track flat index as we render groups
  let flatIndex = -1;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60]"
        style={{ background: "rgba(0,0,0,0.4)" }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed top-[20vh] left-1/2 -translate-x-1/2 w-[480px] max-h-[420px] z-[60] hud-panel rounded-xl flex flex-col overflow-hidden"
        style={{ borderRadius: 12 }}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div
          className="flex items-center gap-2 px-3 py-2.5 shrink-0"
          style={{ borderBottom: `1px solid ${blueprint.nodeBorder}` }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            style={{ color: blueprint.muted, flexShrink: 0 }}
          >
            <circle
              cx="6"
              cy="6"
              r="4.5"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <path
              d="M9.5 9.5L13 13"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder="Search types & relations..."
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: blueprint.nodeBody }}
          />
          <kbd
            className="text-[10px] px-1.5 py-0.5 rounded"
            style={{
              color: blueprint.muted,
              background: `${blueprint.nodeBorder}60`,
            }}
          >
            esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="overflow-y-auto flex-1">
          {flatList.length === 0 ? (
            <div
              className="px-3 py-6 text-center text-xs"
              style={{ color: blueprint.muted }}
            >
              {query.trim() ? "No matches" : "No recent items"}
            </div>
          ) : (
            <>
              {/* "Recent" label when showing recently visited */}
              {!query.trim() && recentlyVisited.length > 0 && (
                <div
                  className="px-3 pt-2 pb-1 text-[10px] font-medium uppercase tracking-wider"
                  style={{ color: blueprint.muted }}
                >
                  Recent
                </div>
              )}

              {Array.from(grouped.entries()).map(([typeName, items]) => (
                <div key={typeName}>
                  {/* Group header — only show when searching (not for recent) */}
                  {query.trim() && (
                    <div
                      className="flex items-center gap-2 px-3 pt-2.5 pb-1 sticky top-0"
                      style={{ background: blueprint.nodeBg }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: getTypeColor(typeName) }}
                      />
                      <span
                        className="text-[10px] font-medium uppercase tracking-wider"
                        style={{ color: blueprint.muted }}
                      >
                        {typeName}
                      </span>
                    </div>
                  )}

                  {/* Result items */}
                  {items.map((item) => {
                    flatIndex++;
                    const currentIndex = flatIndex;
                    const isHighlighted = currentIndex === safeHighlight;
                    const isType = item.kind === "type";
                    const typeColor = getTypeColor(item.type);

                    // Dimension color for bindings
                    const dimensionColor =
                      item.relation
                        ? dimensions.get(item.relation)?.color
                        : undefined;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() =>
                          setHighlightIndex(currentIndex)
                        }
                        data-highlighted={isHighlighted ? "" : undefined}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left cursor-pointer transition-colors"
                        style={{
                          background: isHighlighted
                            ? `${blueprint.accent}12`
                            : "transparent",
                        }}
                      >
                        {/* Row type icon */}
                        {isType ? (
                          <span
                            className="w-2.5 h-2.5 rounded-sm shrink-0"
                            style={{
                              background: typeColor,
                              borderRadius: 2,
                            }}
                          />
                        ) : item.isPermission ? (
                          <PermissionIcon color={typeColor} />
                        ) : (
                          <RelationIcon color={typeColor} />
                        )}

                        {/* Dimension color dot */}
                        {dimensionColor && (
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0 -ml-1"
                            style={{ background: dimensionColor }}
                          />
                        )}

                        {/* Name */}
                        <span
                          className="text-xs font-medium truncate"
                          style={{ color: blueprint.nodeBody }}
                        >
                          {isType
                            ? item.type
                            : `${item.type}#${item.relation}`}
                        </span>

                        {/* Permission badge */}
                        {item.isPermission && (
                          <span
                            className="text-[9px] px-1 py-px rounded shrink-0"
                            style={{
                              color: "#34d399",
                              background: "rgba(52, 211, 153, 0.12)",
                            }}
                          >
                            permission
                          </span>
                        )}

                        {/* Definition (expression) */}
                        {item.definition && (
                          <span
                            className="text-[10px] truncate ml-auto max-w-[160px]"
                            style={{ color: blueprint.muted }}
                          >
                            {item.definition}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
};

/** Wrapper: renders nothing when closed, remounts inner on each open */
const CommandPalette = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => {
  if (!open) return null;
  return <CommandPaletteInner onClose={onClose} />;
};

export default CommandPalette;
