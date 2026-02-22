import { useRef, useCallback } from "react";
import { useViewerStore, DEFAULT_EDITOR_WIDTH } from "../store/viewer-store";
import { blueprint } from "../theme/colors";

const ResizeHandle = () => {
  const panelOpen = useViewerStore((s) => s.panelOpen);
  const togglePanel = useViewerStore((s) => s.togglePanel);
  const setEditorWidth = useViewerStore((s) => s.setEditorWidth);
  const dragging = useRef(false);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!panelOpen) return;
      if ((e.target as HTMLElement).closest("button")) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      dragging.current = true;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [panelOpen],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging.current) return;
      setEditorWidth(e.clientX);
    },
    [setEditorWidth],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging.current) return;
      e.currentTarget.releasePointerCapture(e.pointerId);
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    },
    [],
  );

  const onDoubleClick = useCallback(() => {
    if (panelOpen) setEditorWidth(DEFAULT_EDITOR_WIDTH);
  }, [panelOpen, setEditorWidth]);

  // Collapsed state — thin strip with expand chevron + shortcut hint
  if (!panelOpen) {
    return (
      <div className="shrink-0 flex items-center" style={{ width: 16 }}>
        <button
          onClick={togglePanel}
          className="w-full h-full flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors duration-150 hover:bg-white/5"
          style={{ color: blueprint.muted }}
          title="Show editor (⌘E)"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path
              d="M3.5 1.5L7 5L3.5 8.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-[8px] select-none" style={{ color: blueprint.muted }}>
            ⌘+E
          </span>
        </button>
      </div>
    );
  }

  // Open state — draggable handle with collapse chevron
  return (
    <div
      className="shrink-0 relative flex items-center justify-center cursor-col-resize group"
      style={{ width: 12 }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={onDoubleClick}
    >
      {/* Visible handle line */}
      <div
        className="h-full transition-colors duration-150 group-hover:opacity-100 opacity-60"
        style={{
          width: 1,
          background: blueprint.nodeBorder,
        }}
      />
      {/* Collapse chevron — appears on hover */}
      <button
        onClick={togglePanel}
        className="absolute top-1/2 -translate-y-1/2 w-5 h-8 flex items-center justify-center rounded-sm opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-pointer"
        style={{
          background: "rgba(15, 23, 41, 0.95)",
          border: `1px solid ${blueprint.nodeBorder}`,
          color: blueprint.muted,
        }}
        title="Hide editor (⌘E)"
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path
            d="M5.5 1L2 4L5.5 7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
};

export default ResizeHandle;
