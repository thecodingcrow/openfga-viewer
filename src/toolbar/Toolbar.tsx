import { useCallback, useRef, useState } from "react";
import { useViewerStore } from "../store/viewer-store";
import { blueprint } from "../theme/colors";
import type { LayoutDirection, FocusMode } from "../types";

// ─── Options ────────────────────────────────────────────────────────────────

const LAYOUT_OPTIONS: { value: LayoutDirection; label: string }[] = [
  { value: "TB", label: "Top → Bottom" },
  { value: "LR", label: "Left → Right" },
];

const FOCUS_OPTIONS: { value: FocusMode; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "neighborhood", label: "Neighborhood" },
  { value: "path", label: "Path trace" },
];

// ─── Shared button ──────────────────────────────────────────────────────────

const ToolbarButton = ({
  onClick,
  title,
  children,
  active = false,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  active?: boolean;
}) => (
  <button
    onClick={onClick}
    title={title}
    className="h-8 px-3 flex items-center gap-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer"
    style={{
      color: active ? blueprint.accent : blueprint.nodeBody,
      background: active ? `${blueprint.accent}15` : "transparent",
      border: `1px solid ${active ? `${blueprint.accent}40` : "transparent"}`,
    }}
    onMouseEnter={(e) => {
      if (!active) e.currentTarget.style.background = `${blueprint.accent}10`;
    }}
    onMouseLeave={(e) => {
      if (!active) e.currentTarget.style.background = "transparent";
    }}
  >
    {children}
  </button>
);

// ─── Dropdown wrapper ───────────────────────────────────────────────────────

function Dropdown({
  open,
  onClose,
  children,
  align = "left",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className={`absolute top-full mt-1 ${align === "right" ? "right-0" : "left-0"} rounded-lg overflow-hidden shadow-xl z-50 min-w-[140px]`}
        style={{
          background: blueprint.nodeBg,
          border: `1px solid ${blueprint.nodeBorder}`,
        }}
      >
        {children}
      </div>
    </>
  );
}

function DropdownItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full px-3 py-2 text-left text-xs cursor-pointer transition-colors"
      style={{
        color: active ? blueprint.accent : blueprint.nodeBody,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = `${blueprint.accent}15`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {label}
    </button>
  );
}

// ─── Toolbar ────────────────────────────────────────────────────────────────

const Toolbar = () => {
  const editorOpen = useViewerStore((s) => s.editorOpen);
  const toggleEditor = useViewerStore((s) => s.toggleEditor);
  const layoutDirection = useViewerStore((s) => s.layoutDirection);
  const setLayoutDirection = useViewerStore((s) => s.setLayoutDirection);
  const focusMode = useViewerStore((s) => s.focusMode);
  const setFocusMode = useViewerStore((s) => s.setFocusMode);
  const filters = useViewerStore((s) => s.filters);
  const setFilter = useViewerStore((s) => s.setFilter);
  const availableTypes = useViewerStore((s) => s.availableTypes);
  const setSource = useViewerStore((s) => s.setSource);
  const parse = useViewerStore((s) => s.parse);
  const reactFlowInstance = useViewerStore((s) => s.reactFlowInstance);
  const tracePath = useViewerStore((s) => s.tracePath);
  const pathStart = useViewerStore((s) => s.pathStart);
  const pathEnd = useViewerStore((s) => s.pathEnd);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const handleImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        setSource(text);
        parse(text);
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [setSource, parse],
  );

  const handleFit = useCallback(() => {
    reactFlowInstance?.fitView({ duration: 200 });
  }, [reactFlowInstance]);

  const handleExportPng = useCallback(() => {
    console.warn("PNG export not yet implemented for React Flow");
    setExportOpen(false);
  }, []);

  const handleToggleType = useCallback(
    (typeName: string) => {
      const current = filters.types;
      const next = current.includes(typeName)
        ? current.filter((t) => t !== typeName)
        : [...current, typeName];
      setFilter({ types: next });
    },
    [filters.types, setFilter],
  );

  return (
    <div
      className="fixed top-0 left-0 right-0 z-40 h-12 flex items-center px-4 gap-2 backdrop-blur-sm"
      style={{
        background: `${blueprint.bg}ee`,
        borderBottom: `1px solid ${blueprint.nodeBorder}`,
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 mr-4">
        <div
          className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
          style={{ background: blueprint.accent, color: blueprint.bg }}
        >
          F
        </div>
        <span
          className="text-sm font-semibold tracking-tight"
          style={{ color: blueprint.nodeHeader }}
        >
          OpenFGA Viewer
        </span>
      </div>

      <div
        className="w-px h-6 mx-1"
        style={{ background: blueprint.nodeBorder }}
      />

      {/* Editor toggle */}
      <ToolbarButton
        onClick={toggleEditor}
        title={editorOpen ? "Hide editor (⌘E)" : "Show editor (⌘E)"}
        active={editorOpen}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect
            x="1" y="1" width="12" height="12" rx="2"
            stroke="currentColor" strokeWidth="1.2"
          />
          <path d="M5 1V13" stroke="currentColor" strokeWidth="1.2" />
        </svg>
        Editor
      </ToolbarButton>

      <div
        className="w-px h-6 mx-1"
        style={{ background: blueprint.nodeBorder }}
      />

      {/* Layout dropdown */}
      <div className="relative">
        <ToolbarButton
          onClick={() => setLayoutOpen(!layoutOpen)}
          title="Layout"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.2" />
            <rect x="9" y="1" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.2" />
            <rect x="9" y="9" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.2" />
            <path d="M5 3H9M11 5V9M5 3V11H9" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          Layout
        </ToolbarButton>
        <Dropdown open={layoutOpen} onClose={() => setLayoutOpen(false)}>
          {LAYOUT_OPTIONS.map((opt) => (
            <DropdownItem
              key={opt.value}
              label={opt.label}
              active={layoutDirection === opt.value}
              onClick={() => {
                setLayoutDirection(opt.value);
                setLayoutOpen(false);
              }}
            />
          ))}
        </Dropdown>
      </div>

      {/* Focus mode dropdown */}
      <div className="relative">
        <ToolbarButton
          onClick={() => setFocusOpen(!focusOpen)}
          title="Focus mode"
          active={focusMode !== "overview"}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="7" cy="7" r="2" fill="currentColor" />
          </svg>
          {FOCUS_OPTIONS.find((o) => o.value === focusMode)?.label ?? "Focus"}
        </ToolbarButton>
        <Dropdown open={focusOpen} onClose={() => setFocusOpen(false)}>
          {FOCUS_OPTIONS.map((opt) => (
            <DropdownItem
              key={opt.value}
              label={opt.label}
              active={focusMode === opt.value}
              onClick={() => {
                setFocusMode(opt.value);
                setFocusOpen(false);
              }}
            />
          ))}
        </Dropdown>
      </div>

      {/* Path trace button */}
      {focusMode === "path" && pathStart && pathEnd && (
        <ToolbarButton onClick={tracePath} title="Trace path">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M2 7H12M9 4L12 7L9 10"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Trace
        </ToolbarButton>
      )}

      {/* Filter dropdown */}
      <div className="relative">
        <ToolbarButton
          onClick={() => setFilterOpen(!filterOpen)}
          title="Filters"
          active={filters.types.length > 0 || filters.permissionsOnly}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M1 2.5H13M3 7H11M5 11.5H9"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
          Filter
        </ToolbarButton>
        <Dropdown open={filterOpen} onClose={() => setFilterOpen(false)}>
          <div className="px-3 py-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.permissionsOnly}
                onChange={(e) =>
                  setFilter({ permissionsOnly: e.target.checked })
                }
                className="accent-sky-400"
              />
              <span
                className="text-xs"
                style={{ color: blueprint.nodeBody }}
              >
                Permissions only
              </span>
            </label>
          </div>
          {availableTypes.length > 0 && (
            <>
              <div
                className="mx-2 border-t"
                style={{ borderColor: blueprint.nodeBorder }}
              />
              <div className="px-3 py-1.5">
                <span
                  className="text-[10px] uppercase tracking-wider font-medium"
                  style={{ color: blueprint.muted }}
                >
                  Types
                </span>
              </div>
              {availableTypes.map((t) => (
                <div key={t} className="px-3 py-1.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={
                        filters.types.length === 0 ||
                        filters.types.includes(t)
                      }
                      onChange={() => handleToggleType(t)}
                      className="accent-sky-400"
                    />
                    <span
                      className="text-xs"
                      style={{ color: blueprint.nodeBody }}
                    >
                      {t}
                    </span>
                  </label>
                </div>
              ))}
            </>
          )}
        </Dropdown>
      </div>

      <div
        className="w-px h-6 mx-1"
        style={{ background: blueprint.nodeBorder }}
      />

      {/* Fit */}
      <ToolbarButton onClick={handleFit} title="Fit view">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M1 5V2C1 1.5 1.5 1 2 1H5M9 1H12C12.5 1 13 1.5 13 2V5M13 9V12C13 12.5 12.5 13 12 13H9M5 13H2C1.5 13 1 12.5 1 12V9"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
        Fit
      </ToolbarButton>

      {/* Import */}
      <ToolbarButton
        onClick={() => fileInputRef.current?.click()}
        title="Import .fga file"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M7 1V9M4 6L7 9L10 6M2 11H12"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Import
      </ToolbarButton>

      {/* Export */}
      <div className="relative">
        <ToolbarButton
          onClick={() => setExportOpen(!exportOpen)}
          title="Export graph"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 9V1M4 6L7 9L10 6M2 11H12"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              transform="rotate(180, 7, 7)"
            />
          </svg>
          Export
        </ToolbarButton>
        <Dropdown
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          align="right"
        >
          <DropdownItem label="Export as PNG" onClick={handleExportPng} />
        </Dropdown>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".fga,.openfga,.txt"
        onChange={handleImport}
        className="hidden"
      />

      <div className="flex-1" />
    </div>
  );
};

export default Toolbar;
