import { Fragment, useCallback } from "react";
import { useViewerStore } from "../store/viewer-store";

const Breadcrumb = () => {
  const navigationStack = useViewerStore((s) => s.navigationStack);
  const jumpToLevel = useViewerStore((s) => s.jumpToLevel);

  const handleClick = useCallback(
    (level: number, stepsBack: number) => {
      jumpToLevel(level);
      window.history.go(-stepsBack);
    },
    [jumpToLevel],
  );

  if (navigationStack.length === 0) return null;

  return (
    <div className="absolute top-4 left-3 z-40 flex items-center gap-1 text-xs">
      <button
        className="hud-panel px-2 py-1 rounded-md cursor-pointer"
        style={{ color: "var(--color-text-muted)" }}
        onClick={() => handleClick(0, navigationStack.length)}
      >
        Overview
      </button>
      {navigationStack.map((frame, i) => {
        const isLast = i === navigationStack.length - 1;
        const stepsBack = navigationStack.length - (i + 1);
        return (
          <Fragment key={frame.entryNodeId + "-" + i}>
            <span style={{ color: "var(--color-text-muted)" }}>/</span>
            <button
              className="hud-panel px-2 py-1 rounded-md cursor-pointer"
              style={{ color: isLast ? "var(--color-accent)" : "var(--color-text-muted)" }}
              onClick={() => handleClick(i + 1, stepsBack)}
            >
              {frame.label}
            </button>
          </Fragment>
        );
      })}
    </div>
  );
};

export default Breadcrumb;
