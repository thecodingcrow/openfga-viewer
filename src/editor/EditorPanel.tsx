import { useViewerStore } from "../store/viewer-store";
import { blueprint } from "../theme/colors";
import FgaEditor from "./FgaEditor";

const EditorPanel = () => {
  const editorOpen = useViewerStore((s) => s.editorOpen);
  const parseError = useViewerStore((s) => s.parseError);
  const toggleEditor = useViewerStore((s) => s.toggleEditor);

  return (
    <div
      className="flex flex-col shrink-0 overflow-hidden transition-all duration-300 ease-in-out"
      style={{
        width: editorOpen ? 420 : 0,
        minWidth: editorOpen ? 420 : 0,
        opacity: editorOpen ? 1 : 0,
        pointerEvents: editorOpen ? "auto" : "none",
        background: blueprint.surface,
        borderLeft: editorOpen ? `1px solid ${blueprint.nodeBorder}` : "none",
      }}
    >
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{
          background: blueprint.bg,
          borderBottom: `1px solid ${blueprint.nodeBorder}`,
        }}
      >
        <span
          className="text-xs font-semibold tracking-wider uppercase"
          style={{ color: blueprint.muted }}
        >
          FGA Model
        </span>
        <button
          onClick={toggleEditor}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/5 transition-colors cursor-pointer"
          style={{ color: blueprint.muted }}
          title="Close editor"
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

      <div className="flex-1 min-h-0">
        <FgaEditor />
      </div>

      {parseError && (
        <div
          className="px-3 py-2 text-xs shrink-0 border-t"
          style={{
            color: blueprint.danger,
            background: `${blueprint.danger}10`,
            borderColor: `${blueprint.danger}30`,
          }}
        >
          {parseError}
        </div>
      )}
    </div>
  );
};

export default EditorPanel;
