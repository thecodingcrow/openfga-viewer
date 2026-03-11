import { memo, useState, useEffect, useRef, useCallback } from "react";

const ENTRIES = [
  {
    term: "Root",
    description: "The selected relation or permission being explored.",
    visual: (
      <span
        className="inline-block rounded"
        style={{
          width: 12,
          height: 12,
          border: "2px solid var(--color-accent)",
          background: "rgba(212, 160, 23, 0.08)",
        }}
      />
    ),
  },
  {
    term: "Terminal",
    description: "A directly assignable role — the end of a resolution chain.",
    visual: (
      <span className="flex items-center gap-1">
        <span
          className="inline-block rounded-full"
          style={{ width: 6, height: 6, background: "var(--color-accent)" }}
        />
        <span
          className="inline-block rounded"
          style={{
            width: 12,
            height: 12,
            border: "1px solid var(--color-accent)",
            background: "var(--color-surface-raised)",
          }}
        />
      </span>
    ),
  },
  {
    term: "Intermediate",
    description: "A relation or permission with further upstream dependencies.",
    visual: (
      <span
        className="inline-block rounded"
        style={{
          width: 12,
          height: 12,
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
        }}
      />
    ),
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
      <button
        className="w-7 h-7 flex items-center justify-center rounded transition-colors cursor-pointer"
        style={{ color: open ? "var(--color-accent)" : "var(--color-text-muted)" }}
        title="Graph legend"
        onClick={() => setOpen((prev) => !prev)}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(212,160,23,0.05)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
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

      {open && (
        <div
          className="absolute top-full left-0 mt-1 rounded-lg shadow-lg"
          style={{
            background: "rgba(17, 17, 17, 0.97)",
            border: "1px solid var(--color-border)",
            width: 260,
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
              <div key={entry.term} className="px-3 py-1.5 flex items-start gap-2.5">
                <div className="flex-shrink-0 pt-0.5">{entry.visual}</div>
                <div>
                  <div
                    className="text-xs font-medium"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {entry.term}
                  </div>
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
