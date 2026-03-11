import { useState, useCallback, memo, Fragment } from "react";
import { useViewerStore } from "../store/viewer-store";
import { useHoverStore } from "../store/hover-store";
import type { PathNode } from "../store/hover-store";
import type { ResolutionBranch } from "../graph/resolution-types";
import type { AuthorizationEdge } from "../types";

// -- Flat Summary -------------------------------------------------------------

interface SummaryProps {
  permissionId: string;
  summary: Map<string, string[]>;
  onRoleClick: (nodeId: string) => void;
}

const Summary = memo(function Summary({ permissionId, summary, onRoleClick }: SummaryProps) {
  const label = permissionId.replace("#", " \u203A ");
  const entries = [...summary.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
      <div className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>
        Who can reach <span style={{ color: "var(--color-text-primary)" }}>{label}</span>?
      </div>
      {entries.length === 0 ? (
        <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          No terminal roles found
        </div>
      ) : (
        entries.map(([typeName, roles]) => (
          <div key={typeName} className="mb-1.5">
            <div className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
              {typeName}
            </div>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {roles.map((role) => (
                <button
                  key={role}
                  className="text-xs px-1.5 py-0.5 rounded hover:bg-surface-overlay transition-colors"
                  style={{
                    background: "var(--color-surface-raised)",
                    color: "var(--color-text-primary)",
                  }}
                  onClick={() => onRoleClick(`${typeName}#${role}`)}
                  title={`Audit ${typeName}#${role}`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
});

// -- Resolution Tree ----------------------------------------------------------

function getTerminalLabel(branch: ResolutionBranch): string {
  const id = branch.type === branch.relation ? branch.type : `${branch.type}#${branch.relation}`;
  return branch.edgeType === "tupleset-dep" ? `via ${id}` : `as ${id}`;
}

/** Collect all edge IDs along a branch for hover highlighting */
function collectBranchEdgeIds(
  branch: ResolutionBranch,
  parentNodeId: string,
  edges: AuthorizationEdge[],
): string[] {
  const ids: string[] = [];
  for (const edge of edges) {
    if (
      (edge.source === branch.nodeId && edge.target === parentNodeId) ||
      (edge.source === parentNodeId && edge.target === branch.nodeId)
    ) {
      ids.push(edge.id);
    }
  }
  for (const child of branch.children) {
    ids.push(...collectBranchEdgeIds(child, branch.nodeId, edges));
  }
  return ids;
}

interface BranchItemProps {
  branch: ResolutionBranch;
  parentNodeId: string;
  depth: number;
  defaultExpanded: boolean;
  onRoleClick: (nodeId: string) => void;
  onHoverBranch: (edgeIds: string[], nodeIds: string[], path: PathNode[]) => void;
  onLeaveBranch: () => void;
  edges: AuthorizationEdge[];
  pathFromRoot: PathNode[];
}

const BranchItem = memo(function BranchItem({
  branch,
  parentNodeId,
  depth,
  defaultExpanded,
  onRoleClick,
  onHoverBranch,
  onLeaveBranch,
  edges,
  pathFromRoot,
}: BranchItemProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const hasChildren = branch.children.length > 0;

  const edgeTypeLabel =
    branch.edgeType === "direct" ? "direct"
    : branch.edgeType === "computed" ? "computed"
    : branch.edgeType === "ttu" ? "ttu"
    : "tupleset";

  const handleMouseEnter = useCallback(() => {
    const edgeIds = collectBranchEdgeIds(branch, parentNodeId, edges);
    const currentNode: PathNode = { nodeId: branch.nodeId, label: `${branch.relation} on ${branch.type}` };
    if (branch.isTerminal) {
      currentNode.label += ` ${getTerminalLabel(branch)}`;
    }
    const fullPath = [...pathFromRoot, currentNode];
    const nodeIds = fullPath.map(n => n.nodeId);
    onHoverBranch(edgeIds, nodeIds, fullPath);
  }, [branch, parentNodeId, edges, onHoverBranch, pathFromRoot]);

  return (
    <div>
      <div
        className="flex items-center gap-1.5 py-1 px-4 text-xs hover:bg-surface-raised transition-colors cursor-pointer"
        style={{ paddingLeft: depth * 16 + 16 }}
        onClick={() => {
          if (branch.isTerminal) {
            onRoleClick(branch.nodeId);
          } else if (hasChildren) {
            setExpanded(!expanded);
          }
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={onLeaveBranch}
      >
        {/* Expand/collapse or terminal indicator */}
        {hasChildren ? (
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
        ) : (
          <span
            className="flex-shrink-0 rounded-full"
            style={{
              width: 6,
              height: 6,
              background: branch.isTerminal ? "var(--color-accent)" : "var(--color-text-muted)",
            }}
          />
        )}

        {/* Relation label */}
        <span style={{ color: "var(--color-text-primary)" }}>
          {branch.relation}
        </span>
        <span style={{ color: "var(--color-text-muted)" }}>on</span>
        <span style={{ color: "var(--color-text-secondary)" }}>
          {branch.type}
        </span>

        {/* Edge type badge */}
        <span
          className="ml-auto text-xs px-1 rounded"
          style={{
            color: "var(--color-text-muted)",
            fontSize: "0.6rem",
          }}
        >
          {edgeTypeLabel}
        </span>

        {/* Type restriction badge */}
        {branch.isTerminal && (
          <span
            className="text-xs px-1 rounded"
            style={{
              background: "var(--color-surface-overlay)",
              color: "var(--color-accent)",
              fontSize: "0.6rem",
            }}
          >
            {getTerminalLabel(branch)}
          </span>
        )}
      </div>

      {/* Children */}
      {expanded && hasChildren &&
        branch.children.map((child, i) => (
          <Fragment key={child.nodeId}>
            {i > 0 && (
              <div
                className="text-xs py-0.5"
                style={{
                  paddingLeft: (depth + 1) * 16 + 16 + 6,
                  color: "var(--color-text-muted)",
                  fontSize: "0.55rem",
                  opacity: 0.6,
                }}
              >
                or
              </div>
            )}
            <BranchItem
              branch={child}
              parentNodeId={branch.nodeId}
              depth={depth + 1}
              defaultExpanded={depth < 1}
              onRoleClick={onRoleClick}
              onHoverBranch={onHoverBranch}
              onLeaveBranch={onLeaveBranch}
              edges={edges}
              pathFromRoot={[...pathFromRoot, { nodeId: branch.nodeId, label: `${branch.relation} on ${branch.type}` }]}
            />
          </Fragment>
        ))}
    </div>
  );
});

// -- Main Component -----------------------------------------------------------

const PermissionResolutionView = () => {
  const anchor = useViewerStore((s) => s.anchor);
  const edges = useViewerStore((s) => s.edges);
  const setRoleAnchor = useViewerStore((s) => s.setRoleAnchor);
  const clearAnchor = useViewerStore((s) => s.clearAnchor);
  const setHoverHighlight = useHoverStore((s) => s.setHoverHighlight);
  const clearHover = useHoverStore((s) => s.clearHover);

  const resolutionResult = anchor?.kind === "permission" ? anchor.result : null;

  if (!resolutionResult) {
    return null;
  }

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
      <Summary
        permissionId={resolutionResult.permissionId}
        summary={resolutionResult.summary}
        onRoleClick={setRoleAnchor}
      />
      <div className="py-2">
        <div className="px-4 py-1 text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
          Resolution Tree
        </div>
        {resolutionResult.tree.map((branch, i) => (
          <Fragment key={branch.nodeId}>
            {i > 0 && (
              <div
                className="text-xs py-0.5"
                style={{
                  paddingLeft: 16 + 6,
                  color: "var(--color-text-muted)",
                  fontSize: "0.55rem",
                  opacity: 0.6,
                }}
              >
                or
              </div>
            )}
            <BranchItem
              branch={branch}
              parentNodeId={resolutionResult.permissionId}
              depth={0}
              defaultExpanded={true}
              onRoleClick={setRoleAnchor}
              onHoverBranch={setHoverHighlight}
              onLeaveBranch={clearHover}
              edges={edges}
              pathFromRoot={[{ nodeId: resolutionResult.permissionId, label: resolutionResult.permissionId.replace("#", " on ") }]}
            />
          </Fragment>
        ))}
      </div>
    </div>
  );
};

export default PermissionResolutionView;
