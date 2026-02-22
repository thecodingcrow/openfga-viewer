import { useViewerStore } from "../store/viewer-store";
import { blueprint } from "../theme/colors";
import FgaEditor from "./FgaEditor";

const PANEL_WIDTH = 480;

const EditorPanel = () => {
  const editorOpen = useViewerStore((s) => s.editorOpen);
  const toggleEditor = useViewerStore((s) => s.toggleEditor);
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
        transform: editorOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 250ms ease-out",
        background: "rgba(15, 23, 41, 0.95)",
        boxShadow: editorOpen
          ? "4px 0 24px rgba(0, 0, 0, 0.4)"
          : "none",
      }}
    >
      <div
        className="flex items-center justify-between px-3 shrink-0"
        style={{
          height: "2.25rem",
          borderBottom: `0.0625rem solid ${blueprint.surfaceBorder}`,
        }}
      >
        <span
          className="text-[10px] font-semibold tracking-[0.12em] uppercase"
          style={{ color: blueprint.muted }}
        >
          FGA Model
        </span>
        <div className="flex items-center gap-1.5">
          <span
            className="text-[9px] px-1 py-0.5 rounded select-none"
            style={{
              color: `${blueprint.muted}aa`,
              background: `${blueprint.nodeBorder}30`,
            }}
          >
            ⌘+E
          </span>
          <button
            onClick={toggleEditor}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/5 transition-colors cursor-pointer"
            style={{ color: blueprint.muted }}
            title="Collapse editor"
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
    </div>
  );
};

export default EditorPanel;
