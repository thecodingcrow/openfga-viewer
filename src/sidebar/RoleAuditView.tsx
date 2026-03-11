import { memo } from "react";
import { useViewerStore } from "../store/viewer-store";

interface TypePermissionsProps {
  typeName: string;
  permissions: string[];
  onPermissionClick: (nodeId: string) => void;
}

const TypePermissions = memo(function TypePermissions({
  typeName,
  permissions,
  onPermissionClick,
}: TypePermissionsProps) {
  return (
    <div className="mb-2">
      <div
        className="px-4 py-1 text-xs font-semibold"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {typeName}
      </div>
      {permissions.length === 0 ? (
        <div
          className="px-4 pl-8 py-0.5 text-xs"
          style={{ color: "var(--color-text-muted)" }}
        >
          (none)
        </div>
      ) : (
        permissions.map((perm) => (
          <button
            key={perm}
            className="flex items-center gap-2 w-full px-4 pl-8 py-1 text-left text-xs hover:bg-surface-raised transition-colors"
            style={{ color: "var(--color-text-primary)" }}
            onClick={() => onPermissionClick(`${typeName}#${perm}`)}
            title={`Resolve ${typeName}#${perm}`}
          >
            <span
              className="flex-shrink-0 rounded-sm"
              style={{ width: 6, height: 6, background: "var(--color-accent)" }}
            />
            {perm}
          </button>
        ))
      )}
    </div>
  );
});

const RoleAuditView = () => {
  const anchor = useViewerStore((s) => s.anchor);
  const setPermissionAnchor = useViewerStore((s) => s.setPermissionAnchor);
  const clearAnchor = useViewerStore((s) => s.clearAnchor);
  const availableTypes = useViewerStore((s) => s.availableTypes);

  const roleAuditResult = anchor?.kind === "role" ? anchor.result : null;

  if (!roleAuditResult) {
    return null;
  }

  const roleLabel = roleAuditResult.roleId.replace("#", " \u203A ");

  // Show all types, even those with no reachable permissions
  const allTypes = availableTypes.slice().sort();

  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-dark">
      {/* Clear selection bar */}
      <button
        className="flex items-center gap-1.5 px-4 py-2 text-xs shrink-0 w-full text-left transition-colors hover:bg-surface-raised"
        style={{ color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border-subtle)" }}
        onClick={clearAnchor}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M7 2L3 6L7 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to overview
      </button>
      {/* Header */}
      <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
        <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          What can <span style={{ color: "var(--color-text-primary)" }}>{roleLabel}</span> do?
        </div>
      </div>

      {/* Permissions by type */}
      <div className="py-2">
        {allTypes.map((typeName) => {
          const perms = roleAuditResult.permissions.get(typeName) ?? [];
          return (
            <TypePermissions
              key={typeName}
              typeName={typeName}
              permissions={perms.slice().sort()}
              onPermissionClick={setPermissionAnchor}
            />
          );
        })}
      </div>
    </div>
  );
};

export default RoleAuditView;
