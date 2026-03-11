import { useState, useCallback, useMemo, memo, Fragment } from "react";
import { useViewerStore } from "../store/viewer-store";
import { useHoverStore } from "../store/hover-store";
import type { PathNode } from "../store/hover-store";
import type { ResolutionBranch } from "../graph/resolution-types";
import { groupResolutionTree } from "../graph/group-resolution";
import type { ResolutionGroup, AnswerLineItem } from "../graph/group-resolution";

// -- Helpers ------------------------------------------------------------------

/** Derive edge IDs from a path of nodes (consecutive pairs) */
function edgeIdsFromPath(path: PathNode[]): string[] {
  const ids: string[] = [];
  for (let i = 1; i < path.length; i++) {
    ids.push(`explore-${path[i - 1].nodeId}-${path[i].nodeId}`);
  }
  return ids;
}

// -- OR Separator -------------------------------------------------------------

function OrSeparator({ paddingLeft }: { paddingLeft: number }) {
  return (
    <div
      className="flex items-center gap-2 py-1"
      style={{ paddingLeft }}
    >
      <span
        className="flex-1"
        style={{ borderTop: "1px solid var(--color-border-subtle)" }}
      />
      <span
        style={{
          color: "var(--color-text-muted)",
          fontSize: "0.6rem",
          opacity: 0.5,
        }}
      >
        or
      </span>
      <span
        className="flex-1"
        style={{ borderTop: "1px solid var(--color-border-subtle)" }}
      />
    </div>
  );
}

// -- Answer Line --------------------------------------------------------------

function AnswerLine({ items }: { items: AnswerLineItem[] }) {
  return (
    <div
      className="px-4 pb-3 flex flex-wrap gap-x-1 gap-y-0.5"
      style={{ fontSize: "0.75rem", fontWeight: 500 }}
    >
      {items.map((item, i) => (
        <Fragment key={`${item.kind}-${item.label}`}>
          {i > 0 && (
            <span style={{ color: "var(--color-text-muted)" }}> · </span>
          )}
          <span style={{ color: "var(--color-text-primary)" }}>
            {item.label}
          </span>
        </Fragment>
      ))}
    </div>
  );
}

// -- Branch Item (tree node inside a group) -----------------------------------

function getNodeLabel(branch: ResolutionBranch): string {
  if (branch.type === branch.relation && branch.isTerminal) {
    return `directly assigned [${branch.type}]`;
  }
  return `${branch.relation} on ${branch.type}`;
}

interface BranchItemProps {
  branch: ResolutionBranch;
  depth: number;
  defaultExpanded: boolean;
  onRoleClick: (nodeId: string) => void;
  onHoverBranch: (edgeIds: string[], nodeIds: string[], path: PathNode[]) => void;
  onLeaveBranch: () => void;
  pathFromRoot: PathNode[];
}

const BranchItem = memo(function BranchItem({
  branch,
  depth,
  defaultExpanded,
  onRoleClick,
  onHoverBranch,
  onLeaveBranch,
  pathFromRoot,
}: BranchItemProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const hasChildren = branch.children.length > 0;
  const isDirect = branch.type === branch.relation && branch.isTerminal;

  const handleMouseEnter = useCallback(() => {
    const currentNode: PathNode = { nodeId: branch.nodeId, label: getNodeLabel(branch) };
    const fullPath = [...pathFromRoot, currentNode];
    const nodeIds = fullPath.map((n) => n.nodeId);
    const edgeIds = edgeIdsFromPath(fullPath);
    onHoverBranch(edgeIds, nodeIds, fullPath);
  }, [branch, onHoverBranch, pathFromRoot]);

  return (
    <div>
      <div
        className="flex items-center gap-1.5 py-2 px-4 hover:bg-surface-raised transition-colors leading-relaxed"
        style={{
          paddingLeft: depth * 16 + 16,
          fontSize: isDirect ? "0.7rem" : "0.75rem",
          borderLeft: branch.isTerminal
            ? "2px solid var(--color-accent)"
            : "2px solid transparent",
          cursor: branch.isTerminal || hasChildren ? "pointer" : "default",
        }}
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
            className="inline-flex items-center justify-center w-3.5 h-3.5 flex-shrink-0 transition-transform duration-150"
            style={{
              transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
              color: "var(--color-text-muted)",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 8 8" fill="none">
              <path d="M2 1L6 4L2 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        ) : (
          <span
            className="flex-shrink-0 rounded-full"
            style={{
              width: 6,
              height: 6,
              background: branch.isTerminal
                ? "var(--color-accent)"
                : "var(--color-text-muted)",
            }}
          />
        )}

        {/* Node label */}
        {isDirect ? (
          <span style={{ color: "var(--color-text-muted)" }}>
            directly assigned [{branch.type}]
          </span>
        ) : (
          <span>
            <span style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>
              {branch.relation}
            </span>
            <span style={{ color: "var(--color-text-muted)" }}> on </span>
            <span style={{ color: "var(--color-text-secondary)" }}>
              {branch.type}
            </span>
          </span>
        )}
      </div>

      {/* Children */}
      {expanded &&
        hasChildren &&
        branch.children.map((child, i) => (
          <Fragment key={child.nodeId}>
            {i > 0 && (
              <OrSeparator paddingLeft={(depth + 1) * 16 + 16 + 6} />
            )}
            <BranchItem
              branch={child}
              depth={depth + 1}
              defaultExpanded={depth < 1}
              onRoleClick={onRoleClick}
              onHoverBranch={onHoverBranch}
              onLeaveBranch={onLeaveBranch}
              pathFromRoot={[
                ...pathFromRoot,
                { nodeId: branch.nodeId, label: getNodeLabel(branch) },
              ]}
            />
          </Fragment>
        ))}
    </div>
  );
});

// -- Group Header -------------------------------------------------------------

interface GroupHeaderProps {
  group: ResolutionGroup;
  expanded: boolean;
  onToggle: () => void;
  onHover: () => void;
  onLeave: () => void;
  onRoleClick?: () => void;
}

const GroupHeader = memo(function GroupHeader({
  group,
  expanded,
  onToggle,
  onHover,
  onLeave,
  onRoleClick,
}: GroupHeaderProps) {
  const isDirectItem = group.kind === "direct";

  return (
    <div
      className="flex items-center gap-1.5 py-2 px-4 hover:bg-surface-raised transition-colors"
      style={{
        fontSize: isDirectItem ? "0.7rem" : "0.75rem",
        borderLeft: isDirectItem
          ? "2px solid var(--color-accent)"
          : "2px solid var(--color-border-subtle)",
        cursor: isDirectItem ? (onRoleClick ? "pointer" : "default") : "pointer",
      }}
      onClick={isDirectItem ? onRoleClick : onToggle}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      {/* Chevron for expandable groups, dot for direct items */}
      {isDirectItem ? (
        <span
          className="flex-shrink-0 rounded-full"
          style={{ width: 6, height: 6, background: "var(--color-accent)" }}
        />
      ) : (
        <span
          className="inline-flex items-center justify-center w-3.5 h-3.5 flex-shrink-0 transition-transform duration-150"
          style={{
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
            color: "var(--color-text-muted)",
          }}
        >
          <svg width="10" height="10" viewBox="0 0 8 8" fill="none">
            <path d="M2 1L6 4L2 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}

      {/* Label */}
      <span
        className={isDirectItem ? "" : "font-semibold"}
        style={{ color: isDirectItem ? "var(--color-text-muted)" : "var(--color-text-primary)" }}
      >
        {group.label}
      </span>

      {/* Metadata */}
      {!isDirectItem && (
        <span style={{ color: "var(--color-text-muted)", fontSize: "0.65rem", marginLeft: "auto" }}>
          {group.answerRoles.length === 1
            ? "1 role"
            : `${group.answerRoles.length} roles`}
          {group.isDeep && " · deep"}
        </span>
      )}
    </div>
  );
});

// -- Group Container ----------------------------------------------------------

interface GroupViewProps {
  group: ResolutionGroup;
  rootNodeId: string;
  rootLabel: string;
  onRoleClick: (nodeId: string) => void;
  onHoverBranch: (edgeIds: string[], nodeIds: string[], path: PathNode[]) => void;
  onLeaveBranch: () => void;
}

function GroupView({
  group,
  rootNodeId,
  rootLabel,
  onRoleClick,
  onHoverBranch,
  onLeaveBranch,
}: GroupViewProps) {
  // Default expand: shallow non-direct groups start expanded, deep groups start collapsed.
  // Direct items don't expand (rendered as flat header only).
  const defaultExpanded =
    group.kind !== "direct" && !group.isDeep && group.terminalCount <= 1;
  const [expanded, setExpanded] = useState(defaultExpanded);

  // Build the base path from root. For TTU groups, include the absorbed tupleset node
  // so edge IDs match the graph (root -> tupleset -> tupleset-dep child).
  const basePath = useMemo<PathNode[]>(() => {
    const root: PathNode = { nodeId: rootNodeId, label: rootLabel };
    if (group.kind === "ttu" && group.tuplesetNodeId && group.tuplesetRelation) {
      const tuplesetPath: PathNode = {
        nodeId: group.tuplesetNodeId,
        label: `${group.tuplesetRelation} on ${rootNodeId.split("#")[0]}`,
      };
      return [root, tuplesetPath];
    }
    return [root];
  }, [rootNodeId, rootLabel, group.kind, group.tuplesetNodeId, group.tuplesetRelation]);

  const handleGroupHover = useCallback(() => {
    if (group.kind === "ttu" && group.tuplesetNodeId) {
      // For TTU groups: highlight path to the tupleset entry point
      const nodeIds = basePath.map((n) => n.nodeId);
      const edgeIds = edgeIdsFromPath(basePath);
      onHoverBranch(edgeIds, nodeIds, basePath);
    } else if (group.children.length > 0) {
      // For computed/direct groups: highlight path to the first child
      const firstChild = group.children[0];
      const childNode: PathNode = {
        nodeId: firstChild.nodeId,
        label: getNodeLabel(firstChild),
      };
      const path = [...basePath, childNode];
      const nodeIds = path.map((n) => n.nodeId);
      const edgeIds = edgeIdsFromPath(path);
      onHoverBranch(edgeIds, nodeIds, path);
    }
  }, [group, basePath, onHoverBranch]);

  // For direct groups: clicking the header navigates to role audit
  const directChild = group.kind === "direct" ? group.children[0] : null;
  const handleDirectClick = directChild?.isTerminal
    ? () => onRoleClick(directChild.nodeId)
    : undefined;

  return (
    <div>
      <GroupHeader
        group={group}
        expanded={expanded}
        onToggle={() => setExpanded(!expanded)}
        onHover={handleGroupHover}
        onLeave={onLeaveBranch}
        onRoleClick={handleDirectClick}
      />
      {/* Direct items don't expand — they are flat single-line items */}
      {group.kind !== "direct" &&
        expanded &&
        group.children.map((child, i) => (
          <Fragment key={child.nodeId}>
            {i > 0 && <OrSeparator paddingLeft={16 + 6} />}
            <BranchItem
              branch={child}
              depth={1}
              defaultExpanded={!group.isDeep}
              onRoleClick={onRoleClick}
              onHoverBranch={onHoverBranch}
              onLeaveBranch={onLeaveBranch}
              pathFromRoot={basePath}
            />
          </Fragment>
        ))}
    </div>
  );
}

// -- Main Component -----------------------------------------------------------

const PermissionResolutionView = () => {
  const anchor = useViewerStore((s) => s.anchor);
  const setRoleAnchor = useViewerStore((s) => s.setRoleAnchor);
  const clearAnchor = useViewerStore((s) => s.clearAnchor);
  const setHoverHighlight = useHoverStore((s) => s.setHoverHighlight);
  const clearHover = useHoverStore((s) => s.clearHover);

  const resolutionResult = anchor?.kind === "permission" ? anchor.result : null;

  const grouped = useMemo(
    () => resolutionResult ? groupResolutionTree(resolutionResult.tree) : null,
    [resolutionResult],
  );

  if (!resolutionResult || !grouped) {
    return null;
  }

  const { groups, answerLine } = grouped;
  const [rootType, rootRelation] = resolutionResult.permissionId.split("#");
  const rootLabel = `${rootRelation} on ${rootType}`;

  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-dark">
      {/* Clear selection bar */}
      <button
        className="flex items-center gap-1.5 px-4 py-2 text-xs shrink-0 w-full text-left transition-colors hover:bg-surface-raised"
        style={{
          color: "var(--color-text-muted)",
          borderBottom: "1px solid var(--color-border-subtle)",
          fontSize: "0.8rem",
        }}
        onClick={clearAnchor}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M7 2L3 6L7 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to overview
      </button>

      {/* Question header — single flowing line, wraps only when needed */}
      <div className="px-4 pt-4 pb-3" style={{ fontSize: "0.85rem", lineHeight: 1.5 }}>
        <span style={{ color: "var(--color-text-muted)" }}>Who can </span>
        <span className="font-semibold" style={{ color: "var(--color-accent)" }}>
          {rootRelation}
        </span>
        <span style={{ color: "var(--color-text-muted)" }}> on {rootType}?</span>
      </div>

      {/* Answer line */}
      <AnswerLine items={answerLine} />

      {/* Grouped resolution tree */}
      <div className="pb-2">
        {groups.map((group, i) => (
          <Fragment key={`${group.kind}-${group.label}`}>
            {i > 0 && <OrSeparator paddingLeft={16 + 6} />}
            <GroupView
              group={group}
              rootNodeId={resolutionResult.permissionId}
              rootLabel={rootLabel}
              onRoleClick={setRoleAnchor}
              onHoverBranch={setHoverHighlight}
              onLeaveBranch={clearHover}
            />
          </Fragment>
        ))}
      </div>
    </div>
  );
};

export default PermissionResolutionView;
