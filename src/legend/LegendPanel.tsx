import { useViewerStore } from "../store/viewer-store";
import { blueprint } from "../theme/colors";

// ─── Inline visual swatches ─────────────────────────────────────────────────

const NodeSwatch = ({
  borderColor,
  borderWidth,
  rounded,
  label,
}: {
  borderColor: string;
  borderWidth: number;
  rounded: string;
  label: string;
}) => (
  <div
    className={`px-2 py-0.5 text-[10px] ${rounded} shrink-0`}
    style={{
      background: "rgba(30, 41, 59, 0.9)",
      border: `${borderWidth}px solid ${borderColor}`,
      color: borderColor,
    }}
  >
    {label}
  </div>
);

const EdgeSwatch = ({
  color,
  dashed,
  label,
}: {
  color: string;
  dashed?: boolean;
  label?: string;
}) => (
  <div className="flex items-center gap-1.5 shrink-0">
    <svg width="32" height="12" viewBox="0 0 32 12" fill="none">
      <line
        x1="0"
        y1="6"
        x2="32"
        y2="6"
        stroke={color}
        strokeWidth="1.5"
        strokeDasharray={dashed ? "6 4" : undefined}
      />
    </svg>
    {label && (
      <span
        className="text-[9px] rounded px-1 py-px"
        style={{
          color: "#7dd3fc",
          background: "rgba(15, 23, 41, 0.9)",
        }}
      >
        {label}
      </span>
    )}
  </div>
);

// ─── Legend items ────────────────────────────────────────────────────────────

const LegendItem = ({
  swatch,
  title,
  desc,
}: {
  swatch: React.ReactNode;
  title: string;
  desc: string;
}) => (
  <div className="flex items-start gap-2.5 py-1">
    <div className="flex items-center h-5 shrink-0">{swatch}</div>
    <div className="min-w-0">
      <span className="text-xs font-medium" style={{ color: blueprint.nodeBody }}>
        {title}
      </span>
      <span className="text-xs ml-1" style={{ color: blueprint.muted }}>
        {desc}
      </span>
    </div>
  </div>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <span
    className="text-[10px] font-semibold tracking-wider uppercase block pt-2 pb-0.5"
    style={{ color: blueprint.muted }}
  >
    {children}
  </span>
);

// ─── Panel ──────────────────────────────────────────────────────────────────

const LegendPanel = () => {
  const legendOpen = useViewerStore((s) => s.legendOpen);
  const toggleLegend = useViewerStore((s) => s.toggleLegend);

  return (
    <div
      className="fixed bottom-14 left-3 z-40 w-[280px] hud-panel flex flex-col overflow-hidden"
      style={{
        borderRadius: 12,
        transform: legendOpen
          ? "translateY(0) scale(1)"
          : "translateY(12px) scale(0.95)",
        opacity: legendOpen ? 1 : 0,
        transition: "transform 200ms ease-out, opacity 200ms ease-out",
        pointerEvents: legendOpen ? "auto" : "none",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: `1px solid ${blueprint.nodeBorder}` }}
      >
        <span
          className="text-xs font-semibold tracking-wider uppercase"
          style={{ color: blueprint.muted }}
        >
          Legend
        </span>
        <button
          onClick={toggleLegend}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/5 transition-colors cursor-pointer"
          style={{ color: blueprint.muted }}
          title="Close legend"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="px-3 pb-3 overflow-y-auto">
        <SectionLabel>Nodes</SectionLabel>
        <LegendItem
          swatch={
            <NodeSwatch
              borderColor="#f59e0b"
              borderWidth={2}
              rounded="rounded-lg"
              label="type"
            />
          }
          title="Type"
          desc="— object type (user, doc)"
        />
        <LegendItem
          swatch={
            <NodeSwatch
              borderColor="#f59e0b60"
              borderWidth={1}
              rounded="rounded-md"
              label="relation"
            />
          }
          title="Relation"
          desc="— defined relation"
        />
        <LegendItem
          swatch={
            <NodeSwatch
              borderColor="#34d399"
              borderWidth={1}
              rounded="rounded-full"
              label="perm"
            />
          }
          title="Permission"
          desc="— computed permission"
        />

        <SectionLabel>Edges</SectionLabel>
        <LegendItem
          swatch={<EdgeSwatch color="#94a3b8" />}
          title="Direct"
          desc="— type restriction"
        />
        <LegendItem
          swatch={<EdgeSwatch color="#64748b" dashed />}
          title="Computed"
          desc="— userset reference"
        />
        <LegendItem
          swatch={<EdgeSwatch color="#38bdf8" label="from X" />}
          title="TTU"
          desc="— tuple-to-userset"
        />

        <SectionLabel>Colors</SectionLabel>
        <p className="text-[11px] py-0.5" style={{ color: blueprint.muted }}>
          Each FGA type gets a unique accent color. Permissions use{" "}
          <span style={{ color: "#34d399" }}>emerald</span>.
        </p>
      </div>
    </div>
  );
};

export default LegendPanel;
