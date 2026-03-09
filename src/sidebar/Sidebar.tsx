import { memo } from "react";
import { useViewerStore } from "../store/viewer-store";
import TypeBrowser from "./TypeBrowser";
import PermissionResolutionView from "./PermissionResolutionView";
import RoleAuditView from "./RoleAuditView";
import PermissionCheckerView from "./PermissionCheckerView";

type SidebarMode = "resolution" | "audit" | "checker";

const MODE_LABELS: Record<SidebarMode, string> = {
  resolution: "Resolution",
  audit: "Audit",
  checker: "Checker",
};

const Sidebar = memo(function Sidebar() {
  const anchor = useViewerStore((s) => s.anchor);
  const nodes = useViewerStore((s) => s.nodes);
  const setPermissionAnchor = useViewerStore((s) => s.setPermissionAnchor);
  const setRoleAnchor = useViewerStore((s) => s.setRoleAnchor);
  const clearAnchor = useViewerStore((s) => s.clearAnchor);

  // Determine current mode from anchor
  const currentMode: SidebarMode | null = anchor
    ? anchor.kind === "permission"
      ? "resolution"
      : anchor.kind === "role"
        ? "audit"
        : "checker"
    : null;

  // Build anchor label for breadcrumb
  const anchorLabel = anchor
    ? anchor.kind === "checker"
      ? "Checker"
      : anchor.nodeId.replace("#", " \u203A ")
    : null;

  // Find the node for switching modes
  const anchorNode = anchor && anchor.kind !== "checker"
    ? nodes.find((n) => n.id === anchor.nodeId)
    : null;

  const handleModeSwitch = (mode: SidebarMode) => {
    if (!anchor) return;
    if (mode === currentMode) return;

    // Cannot switch to checker without both subject and target IDs;
    // setCheckerAnchor requires two string arguments.
    if (mode === "checker") return;

    if (mode === "resolution" && anchorNode) {
      if (anchorNode.isPermission) {
        setPermissionAnchor(anchorNode.id);
      }
    } else if (mode === "audit" && anchorNode) {
      if (!anchorNode.isPermission) {
        setRoleAnchor(anchorNode.id);
      }
    }
  };

  return (
    <div
      className="flex flex-col h-full"
      style={{
        width: 340,
        minWidth: 340,
        background: "var(--color-surface)",
        borderLeft: "1px solid var(--color-border)",
      }}
    >
      {/* Top: anchor breadcrumb */}
      {anchor && (
        <div
          className="flex items-center justify-between px-4 py-2 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{
                background: "var(--color-surface-raised)",
                color: "var(--color-accent)",
                fontSize: "0.65rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {currentMode}
            </span>
            <span
              className="text-xs truncate"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {anchorLabel}
            </span>
          </div>
          <button
            className="text-xs px-1.5 py-0.5 rounded hover:bg-surface-raised transition-colors"
            style={{ color: "var(--color-text-muted)" }}
            onClick={clearAnchor}
            title="Clear selection"
          >
            &#x2715;
          </button>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-dark">
        {!anchor && <TypeBrowser />}
        {anchor?.kind === "permission" && <PermissionResolutionView />}
        {anchor?.kind === "role" && <RoleAuditView />}
        {anchor?.kind === "checker" && <PermissionCheckerView />}
      </div>

      {/* Bottom: mode tabs (only when anchor is active) */}
      {anchor && (
        <div
          className="flex flex-shrink-0"
          style={{ borderTop: "1px solid var(--color-border-subtle)" }}
        >
          {(Object.keys(MODE_LABELS) as SidebarMode[]).map((mode) => (
            <button
              key={mode}
              className="flex-1 py-2 text-xs text-center transition-colors"
              style={{
                color: mode === currentMode ? "var(--color-accent)" : "var(--color-text-muted)",
                background: mode === currentMode ? "var(--color-surface-raised)" : "transparent",
                borderTop: mode === currentMode ? "2px solid var(--color-accent)" : "2px solid transparent",
              }}
              onClick={() => handleModeSwitch(mode)}
            >
              {MODE_LABELS[mode]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

export default Sidebar;
