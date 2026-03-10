import { memo } from "react";
import { useViewerStore } from "../store/viewer-store";
import TypeBrowser from "./TypeBrowser";

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
  const availableTypes = useViewerStore((s) => s.availableTypes);

  const roleAuditResult = anchor?.kind === "role" ? anchor.result : null;

  if (!roleAuditResult) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex flex-col items-center px-4 pt-8 pb-4 gap-2">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ color: "var(--color-text-muted)" }}>
            <path d="M6 16H12L16 6L20 26L24 16H26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
            Select a role to audit
          </div>
          <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            See what permissions a role can reach downstream
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-dark" style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
          <TypeBrowser filter="relations" />
        </div>
      </div>
    );
  }

  const roleLabel = roleAuditResult.roleId.replace("#", " \u203A ");

  // Show all types, even those with no reachable permissions
  const allTypes = availableTypes.slice().sort();

  return (
    <div className="flex flex-col">
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
