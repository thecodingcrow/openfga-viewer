import { memo, useState, useEffect, useRef, useCallback } from "react";

interface LegendEntry {
  term: string;
  description: string;
  color?: string;
  badge?: boolean;
}

const ENTRIES: LegendEntry[] = [
  {
    term: "Root",
    description: "The selected relation or permission being explored.",
    color: "var(--color-accent)",
  },
  {
    term: "Terminal",
    description:
      "A leaf node — a directly assignable relation with no further upstream dependencies. The end of a resolution chain.",
    color: "var(--color-accent)",
    badge: true,
  },
  {
    term: "direct",
    description:
      "A direct type restriction. The relation accepts tuples of a specific type (e.g., user, group#member).",
    badge: true,
  },
  {
    term: "computed",
    description:
      "A computed userset. The relation is defined as a reference to another relation on the same type.",
    badge: true,
  },
  {
    term: "ttu",
    description:
      "Tuple-to-userset. The relation is resolved by following a tupleset relation to another type, then checking a computed relation there.",
    badge: true,
  },
  {
    term: "tupleset",
    description:
      "The tupleset side of a TTU rewrite. This relation provides the \"from\" lookup that TTU traverses.",
    badge: true,
  },
];

function GraphLegendComponent() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as HTMLElement)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, handleClickOutside]);

  return (
    <div className="relative" ref={ref}>
      {/* Trigger button — rendered inside React Flow <Controls>, inherits its panel styling */}
      <button
        className="react-flow__controls-button flex items-center justify-center transition-colors"
        style={{
          color: open ? "var(--color-accent)" : "var(--color-text-muted)",
          cursor: "pointer",
        }}
        title="Graph legend"
        onClick={() => setOpen((prev) => !prev)}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
          <path
            d="M5.5 5.5C5.5 4.67 6.17 4 7 4C7.83 4 8.5 4.67 8.5 5.5C8.5 6.15 8.05 6.55 7.5 6.8V7.5"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <circle cx="7" cy="9.5" r="0.6" fill="currentColor" />
        </svg>
      </button>

      {/* Expanded card — click outside to close */}
      {open && (
        <div
          className="absolute bottom-0 left-10 rounded-lg shadow-lg scrollbar-dark"
          style={{
            background: "rgba(17, 17, 17, 0.97)",
            border: "1px solid var(--color-border)",
            width: 320,
            maxHeight: 420,
            overflowY: "auto",
            zIndex: 50,
          }}
        >
          <div
            className="px-3 py-2 text-xs font-semibold"
            style={{
              color: "var(--color-text-secondary)",
              borderBottom: "1px solid var(--color-border-subtle)",
            }}
          >
            Legend
          </div>
          <div className="py-1">
            {ENTRIES.map((entry) => (
              <div
                key={entry.term}
                className="px-3 py-1.5 flex gap-2"
              >
                <div className="flex-shrink-0 pt-0.5">
                  {entry.badge ? (
                    <span
                      className="inline-block text-xs px-1 rounded"
                      style={{
                        color: entry.color ?? "var(--color-text-muted)",
                        background: "var(--color-surface-overlay)",
                        fontSize: "0.6rem",
                      }}
                    >
                      {entry.term}
                    </span>
                  ) : (
                    <span
                      className="inline-block rounded-full"
                      style={{
                        width: 8,
                        height: 8,
                        background: entry.color ?? "var(--color-text-muted)",
                        marginTop: 2,
                      }}
                    />
                  )}
                </div>
                <div>
                  {!entry.badge && (
                    <div
                      className="text-xs font-medium"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {entry.term}
                    </div>
                  )}
                  <div
                    className="text-xs leading-relaxed"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {entry.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export const GraphLegend = memo(GraphLegendComponent);
