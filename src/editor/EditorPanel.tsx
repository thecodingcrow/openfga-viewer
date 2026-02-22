import { useViewerStore } from "../store/viewer-store";
import { blueprint } from "../theme/colors";
import FgaEditor from "./FgaEditor";
import InspectContent from "../inspect/InspectPanel";

const PANEL_WIDTH = 480;

const TAB_ITEMS: { key: 'editor' | 'inspector'; label: string }[] = [
  { key: 'editor', label: 'Editor' },
  { key: 'inspector', label: 'Inspector' },
];

const EditorPanel = () => {
  const panelOpen = useViewerStore((s) => s.panelOpen);
  const panelTab = useViewerStore((s) => s.panelTab);
  const togglePanel = useViewerStore((s) => s.togglePanel);
  const setPanelTab = useViewerStore((s) => s.setPanelTab);
  const parseError = useViewerStore((s) => s.parseError);

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 40,
        width: PANEL_WIDTH,
        transform: panelOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 250ms ease-out",
        background: "rgba(15, 23, 41, 0.95)",
        boxShadow: panelOpen
          ? "4px 0 24px rgba(0, 0, 0, 0.4)"
          : "none",
      }}
    >
      {/* Header with tabs */}
      <div
        className="flex items-center justify-between px-3 shrink-0"
        style={{
          height: "2.25rem",
          borderBottom: `0.0625rem solid ${blueprint.surfaceBorder}`,
        }}
      >
        {/* Tab buttons */}
        <div className="flex items-center gap-3">
          {TAB_ITEMS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setPanelTab(tab.key)}
              className="text-[10px] font-semibold tracking-[0.12em] uppercase cursor-pointer pb-px relative"
              style={{
                color: panelTab === tab.key ? blueprint.accent : blueprint.muted,
                background: "transparent",
                border: "none",
                borderBottom: panelTab === tab.key
                  ? `2px solid ${blueprint.accent}`
                  : "2px solid transparent",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right side: shortcut badge + close */}
        <div className="flex items-center gap-1.5">
          <span
            className="text-[9px] px-1 py-0.5 rounded select-none"
            style={{
              color: `${blueprint.muted}aa`,
              background: `${blueprint.nodeBorder}30`,
            }}
          >
            Cmd+E
          </span>
          <button
            onClick={togglePanel}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/5 transition-colors cursor-pointer"
            style={{ color: blueprint.muted }}
            title="Collapse panel"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path
                d="M6.5 1.5L3 5L6.5 8.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Tab content */}
      {panelTab === 'editor' ? (
        <>
          <div className="flex-1 min-h-0">
            <FgaEditor />
          </div>

          {parseError && (
            <div
              className="px-3 py-1.5 text-xs shrink-0"
              style={{
                color: blueprint.danger,
                background: `${blueprint.danger}08`,
                borderTop: `0.0625rem solid ${blueprint.danger}20`,
              }}
            >
              {parseError}
            </div>
          )}
        </>
      ) : (
        <InspectContent />
      )}
    </div>
  );
};

export default EditorPanel;
