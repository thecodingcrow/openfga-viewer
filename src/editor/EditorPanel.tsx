import { useViewerStore } from "../store/viewer-store";
import { blueprint } from "../theme/colors";
import FgaEditor from "./FgaEditor";

const EditorPanel = () => {
  const editorOpen = useViewerStore((s) => s.editorOpen);
  const editorWidth = useViewerStore((s) => s.editorWidth);
  const parseError = useViewerStore((s) => s.parseError);

  return (
    <div
      className="shrink-0 flex flex-col overflow-hidden"
      style={{
        width: editorOpen ? editorWidth : 0,
        minWidth: 0,
        transition: "width 250ms ease-out",
        background: "rgba(15, 23, 41, 0.9)",
        backdropFilter: "blur(12px)",
        borderRight: "1px solid #2a3a5c",
        boxShadow: "0 4px 24px rgba(0, 0, 0, 0.4)",
      }}
    >
      <div
        className="flex items-center px-3 py-2 shrink-0"
        style={{
          borderBottom: `1px solid ${blueprint.nodeBorder}`,
        }}
      >
        <span
          className="text-xs font-semibold tracking-wider uppercase"
          style={{ color: blueprint.muted }}
        >
          FGA Model
        </span>
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
