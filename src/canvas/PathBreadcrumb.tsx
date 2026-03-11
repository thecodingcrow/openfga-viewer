import { memo, Fragment } from "react";
import { Panel } from "@xyflow/react";
import { useHoverStore } from "../store/hover-store";

function PathBreadcrumbComponent() {
  const isHoverActive = useHoverStore((s) => s.isHoverActive);
  const hoveredPath = useHoverStore((s) => s.hoveredPath);

  if (!isHoverActive || hoveredPath.length === 0) return null;

  return (
    <Panel position="top-center">
      <div
        className="flex items-center flex-wrap gap-1 px-3 py-1.5 rounded-lg text-xs"
        style={{
          background: "rgba(17, 17, 17, 0.95)",
          border: "1px solid var(--color-border)",
          maxWidth: "95vw",
        }}
      >
        {hoveredPath.map((node, i) => (
          <Fragment key={node.nodeId}>
            {i > 0 && (
              <span style={{ color: "var(--color-text-muted)" }}>→</span>
            )}
            <span
              style={{
                color: i === hoveredPath.length - 1
                  ? "var(--color-accent)"
                  : "var(--color-text-primary)",
                whiteSpace: "nowrap",
              }}
            >
              {node.label}
            </span>
          </Fragment>
        ))}
      </div>
    </Panel>
  );
}

export const PathBreadcrumb = memo(PathBreadcrumbComponent);
