import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useViewerStore } from "../store/viewer-store";
import { getTypeColor } from "../theme/colors";
import { blueprint } from "../theme/colors";
import type { AuthorizationNode } from "../types";

const MAX_RESULTS = 30;

function matchNode(node: AuthorizationNode, query: string): boolean {
  const q = query.toLowerCase();
  if (node.type.toLowerCase().includes(q)) return true;
  if (node.relation?.toLowerCase().includes(q)) return true;
  if (node.id.toLowerCase().includes(q)) return true;
  return false;
}

function sortResults(a: AuthorizationNode, b: AuthorizationNode): number {
  if (a.kind !== b.kind) return a.kind === "type" ? -1 : 1;
  const typeCmp = a.type.localeCompare(b.type);
  if (typeCmp !== 0) return typeCmp;
  return (a.relation ?? "").localeCompare(b.relation ?? "");
}

/** Inner component — remounted on each open so state resets naturally */
const CommandPaletteInner = ({ onClose }: { onClose: () => void }) => {
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const nodes = useViewerStore((s) => s.nodes);
  const selectNode = useViewerStore((s) => s.selectNode);
  const reactFlowInstance = useViewerStore((s) => s.reactFlowInstance);

  const results = useMemo(() => {
    const filtered = query.trim()
      ? nodes.filter((n) => matchNode(n, query.trim()))
      : nodes.slice();
    return filtered.sort(sortResults).slice(0, MAX_RESULTS);
  }, [nodes, query]);

  // Clamp highlight when results shrink
  const safeHighlight = Math.min(highlightIndex, Math.max(0, results.length - 1));

  // Focus input on mount
  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const navigateToNode = useCallback(
    (id: string) => {
      if (!reactFlowInstance) return;
      selectNode(id);
      reactFlowInstance.fitView({
        nodes: [{ id }],
        duration: 200,
        padding: 0.3,
      });
      onClose();
    },
    [reactFlowInstance, selectNode, onClose],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, results.length - 1));
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
        const node = results[safeHighlight];
        if (node) navigateToNode(node.id);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [results, safeHighlight, navigateToNode, onClose],
  );

  const handleQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value);
      setHighlightIndex(0);
    },
    [],
  );

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[60]" onClick={onClose} />

      {/* Panel */}
      <div
        className="fixed top-[20vh] left-1/2 -translate-x-1/2 w-[400px] max-h-[360px] z-[60] hud-panel rounded-xl flex flex-col overflow-hidden"
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
          {results.length === 0 ? (
            <div
              className="px-3 py-6 text-center text-xs"
              style={{ color: blueprint.muted }}
            >
              No matches
            </div>
          ) : (
            results.map((node, i) => {
              const isHighlighted = i === safeHighlight;
              const isType = node.kind === "type";
              const color = getTypeColor(node.type);

              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => navigateToNode(node.id)}
                  onMouseEnter={() => setHighlightIndex(i)}
                  data-highlighted={isHighlighted ? "" : undefined}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left cursor-pointer transition-colors"
                  style={{
                    background: isHighlighted
                      ? `${blueprint.accent}12`
                      : "transparent",
                  }}
                >
                  {/* Color dot */}
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      background: isType ? color : `${color}60`,
                    }}
                  />

                  {/* Label */}
                  <span
                    className="text-xs font-medium truncate"
                    style={{ color: blueprint.nodeBody }}
                  >
                    {isType ? node.type : `${node.type}#${node.relation}`}
                  </span>

                  {/* Permission badge */}
                  {node.isPermission && (
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

                  {/* Definition */}
                  {node.definition && (
                    <span
                      className="text-[10px] truncate ml-auto"
                      style={{ color: blueprint.muted }}
                    >
                      {node.definition}
                    </span>
                  )}
                </button>
              );
            })
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
