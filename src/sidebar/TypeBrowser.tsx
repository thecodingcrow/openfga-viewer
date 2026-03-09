import { useState, useMemo, useCallback, memo } from "react";
import type { AuthorizationNode } from "../types";
import { useViewerStore } from "../store/viewer-store";

interface TypeGroup {
  typeName: string;
  relations: { id: string; name: string }[];
  permissions: { id: string; name: string }[];
}

function groupByType(nodes: AuthorizationNode[]): TypeGroup[] {
  const map = new Map<string, TypeGroup>();
  for (const node of nodes) {
    if (node.kind === "type" || !node.relation) continue;
    let group = map.get(node.type);
    if (!group) {
      group = { typeName: node.type, relations: [], permissions: [] };
      map.set(node.type, group);
    }
    if (node.isPermission) {
      group.permissions.push({ id: node.id, name: node.relation });
    } else if (!node.isTuplesetBinding) {
      group.relations.push({ id: node.id, name: node.relation });
    }
  }
  return [...map.values()].sort((a, b) => a.typeName.localeCompare(b.typeName));
}

interface TypeSectionProps {
  group: TypeGroup;
  expanded: boolean;
  onToggle: () => void;
  onSelectRelation: (nodeId: string) => void;
  onSelectPermission: (nodeId: string) => void;
}

const TypeSection = memo(function TypeSection({
  group,
  expanded,
  onToggle,
  onSelectRelation,
  onSelectPermission,
}: TypeSectionProps) {
  return (
    <div>
      {/* Type header */}
      <button
        className="flex items-center gap-2 w-full px-4 py-2 text-left text-xs font-semibold hover:bg-surface-raised transition-colors"
        style={{ color: "var(--color-text-primary)" }}
        onClick={onToggle}
      >
        <span
          className="inline-flex items-center justify-center w-3 h-3 flex-shrink-0 transition-transform duration-150"
          style={{
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
            color: "var(--color-text-muted)",
          }}
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path d="M2 1L6 4L2 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        {group.typeName}
      </button>

      {/* Expanded children */}
      {expanded && (
        <div className="pb-1">
          {group.relations.map((r) => (
            <button
              key={r.id}
              className="flex items-center gap-2 w-full px-4 pl-9 py-1 text-left text-xs hover:bg-surface-raised transition-colors"
              style={{ color: "var(--color-text-secondary)" }}
              onClick={() => onSelectRelation(r.id)}
            >
              <span
                className="flex-shrink-0 rounded-full"
                style={{ width: 6, height: 6, background: "var(--color-dot-relation)" }}
              />
              {r.name}
            </button>
          ))}
          {group.permissions.map((p) => (
            <button
              key={p.id}
              className="flex items-center gap-2 w-full px-4 pl-9 py-1 text-left text-xs hover:bg-surface-raised transition-colors"
              style={{ color: "var(--color-text-secondary)" }}
              onClick={() => onSelectPermission(p.id)}
            >
              <span
                className="flex-shrink-0 rounded-sm"
                style={{ width: 6, height: 6, background: "var(--color-accent)" }}
              />
              {p.name}
            </button>
          ))}
          {group.relations.length === 0 && group.permissions.length === 0 && (
            <div className="px-4 pl-9 py-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
              (empty)
            </div>
          )}
        </div>
      )}
    </div>
  );
});

const TypeBrowser = () => {
  const nodes = useViewerStore((s) => s.nodes);
  const setRoleAnchor = useViewerStore((s) => s.setRoleAnchor);
  const setPermissionAnchor = useViewerStore((s) => s.setPermissionAnchor);

  const groups = useMemo(() => groupByType(nodes), [nodes]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const toggleExpanded = useCallback((typeName: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(typeName)) next.delete(typeName);
      else next.add(typeName);
      return next;
    });
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
        <div className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>
          Type Browser
        </div>
        <div className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
          Select a relation or permission to explore
        </div>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-dark py-1">
        {groups.map((g) => (
          <TypeSection
            key={g.typeName}
            group={g}
            expanded={expanded.has(g.typeName)}
            onToggle={() => toggleExpanded(g.typeName)}
            onSelectRelation={setRoleAnchor}
            onSelectPermission={setPermissionAnchor}
          />
        ))}
      </div>
    </div>
  );
};

export default TypeBrowser;
