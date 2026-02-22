import { useState, useMemo, useCallback, memo } from "react";
import type { AuthorizationNode, Dimension } from "../types";
import { useViewerStore } from "../store/viewer-store";
import { useHoverStore } from "../store/hover-store";
import { getTypeColor } from "../theme/colors";
import { blueprint } from "../theme/colors";
import { transformExpression } from "../dimensions/detect";
import { TruncationTooltip } from "../components/Tooltip";

// ─── Tree data model ─────────────────────────────────────────────────────────

interface TreeNode {
  id: string;
  label: string;
  expression?: string;
  color?: string;
  section: "type" | "binding" | "relation" | "permission";
  children: TreeNode[];
}

// ─── Tree building ───────────────────────────────────────────────────────────

/**
 * Build tree for the full overview (no subgraph).
 * Each type is a root node with its relations/permissions as children.
 */
function buildOverviewTree(
  nodes: AuthorizationNode[],
  dimensions: Map<string, Dimension>,
): TreeNode[] {
  // Group nodes by type
  const byType = new Map<string, AuthorizationNode[]>();
  for (const node of nodes) {
    if (node.kind === "type") continue;
    const group = byType.get(node.type);
    if (group) group.push(node);
    else byType.set(node.type, [node]);
  }

  // Get type names in sorted order
  const typeNames = [...byType.keys()].sort();

  return typeNames.map((typeName) => {
    const children = byType.get(typeName) ?? [];
    const childNodes: TreeNode[] = [];

    // Bindings first
    const bindings = children
      .filter((n) => n.isTuplesetBinding)
      .sort((a, b) => (a.relation ?? "").localeCompare(b.relation ?? ""));
    for (const b of bindings) {
      const dim = b.relation ? dimensions.get(b.relation) : undefined;
      childNodes.push({
        id: b.id,
        label: b.relation ?? b.id,
        color: dim?.color,
        section: "binding",
        children: [],
      });
    }

    // Relations
    const relations = children
      .filter((n) => !n.isTuplesetBinding && !n.isPermission)
      .sort((a, b) => (a.relation ?? "").localeCompare(b.relation ?? ""));
    for (const r of relations) {
      childNodes.push({
        id: r.id,
        label: r.relation ?? r.id,
        expression: r.definition ? transformExpression(r.definition) : undefined,
        section: "relation",
        children: [],
      });
    }

    // Permissions
    const permissions = children
      .filter((n) => n.isPermission)
      .sort((a, b) => (a.relation ?? "").localeCompare(b.relation ?? ""));
    for (const p of permissions) {
      childNodes.push({
        id: p.id,
        label: p.relation ?? p.id,
        expression: p.definition ? transformExpression(p.definition) : undefined,
        section: "permission",
        children: [],
      });
    }

    return {
      id: typeName,
      label: typeName,
      color: getTypeColor(typeName),
      section: "type" as const,
      children: childNodes,
    };
  });
}

/**
 * Build tree for subgraph view. Re-roots to show only the current frame's
 * visible types and relevant rows.
 */
function buildSubgraphTree(
  nodes: AuthorizationNode[],
  dimensions: Map<string, Dimension>,
  visibleTypeIds: Set<string>,
  relevantRowIds: Set<string>,
  entryNodeId: string,
): TreeNode[] {
  // Build the same overview tree but scoped to visible types
  const byType = new Map<string, AuthorizationNode[]>();
  for (const node of nodes) {
    if (node.kind === "type") continue;
    if (!visibleTypeIds.has(node.type)) continue;
    const group = byType.get(node.type);
    if (group) group.push(node);
    else byType.set(node.type, [node]);
  }

  // Find the entry type to put it first
  const entryType = entryNodeId.split("#")[0];

  // Sort types: entry type first, then alphabetical
  const typeNames = [...byType.keys()].sort((a, b) => {
    if (a === entryType) return -1;
    if (b === entryType) return 1;
    return a.localeCompare(b);
  });

  return typeNames.map((typeName) => {
    const children = byType.get(typeName) ?? [];
    const childNodes: TreeNode[] = [];

    // Filter to relevant rows only (non-dimmed)
    const relevant = children.filter((n) => relevantRowIds.has(n.id));

    // Bindings
    const bindings = relevant
      .filter((n) => n.isTuplesetBinding)
      .sort((a, b) => (a.relation ?? "").localeCompare(b.relation ?? ""));
    for (const b of bindings) {
      const dim = b.relation ? dimensions.get(b.relation) : undefined;
      childNodes.push({
        id: b.id,
        label: b.relation ?? b.id,
        color: dim?.color,
        section: "binding",
        children: [],
      });
    }

    // Relations
    const relations = relevant
      .filter((n) => !n.isTuplesetBinding && !n.isPermission)
      .sort((a, b) => (a.relation ?? "").localeCompare(b.relation ?? ""));
    for (const r of relations) {
      childNodes.push({
        id: r.id,
        label: r.relation ?? r.id,
        expression: r.definition ? transformExpression(r.definition) : undefined,
        section: "relation",
        children: [],
      });
    }

    // Permissions
    const permissions = relevant
      .filter((n) => n.isPermission)
      .sort((a, b) => (a.relation ?? "").localeCompare(b.relation ?? ""));
    for (const p of permissions) {
      childNodes.push({
        id: p.id,
        label: p.relation ?? p.id,
        expression: p.definition ? transformExpression(p.definition) : undefined,
        section: "permission",
        children: [],
      });
    }

    return {
      id: typeName,
      label: typeName,
      color: getTypeColor(typeName),
      section: "type" as const,
      children: childNodes,
    };
  });
}

// ─── Filter helpers ──────────────────────────────────────────────────────────

/** Check if a tree node or any descendant matches the filter */
function matchesFilter(node: TreeNode, filter: string): boolean {
  const lower = filter.toLowerCase();
  if (node.label.toLowerCase().includes(lower)) return true;
  if (node.expression?.toLowerCase().includes(lower)) return true;
  return node.children.some((c) => matchesFilter(c, lower));
}

/** Collect IDs of nodes that match or have matching descendants (for auto-expand) */
function collectMatchingAncestors(
  nodes: TreeNode[],
  filter: string,
): Set<string> {
  const ids = new Set<string>();
  function walk(node: TreeNode): boolean {
    const lower = filter.toLowerCase();
    const selfMatches =
      node.label.toLowerCase().includes(lower) ||
      (node.expression?.toLowerCase().includes(lower) ?? false);
    let childMatches = false;
    for (const child of node.children) {
      if (walk(child)) childMatches = true;
    }
    if (selfMatches || childMatches) {
      ids.add(node.id);
      return true;
    }
    return false;
  }
  for (const node of nodes) walk(node);
  return ids;
}

// ─── TreeItem component ──────────────────────────────────────────────────────

const NEUTRAL_DOT = "#64748b";

interface TreeItemProps {
  node: TreeNode;
  expanded: Set<string>;
  toggleExpanded: (id: string) => void;
  filter: string;
  filterMatchIds: Set<string>;
  onNodeClick: (id: string, section: TreeNode["section"]) => void;
  onNodeHover: (id: string, section: TreeNode["section"]) => void;
  onNodeLeave: () => void;
  depth: number;
}

function TreeItemComponent({
  node,
  expanded,
  toggleExpanded,
  filter,
  filterMatchIds,
  onNodeClick,
  onNodeHover,
  onNodeLeave,
  depth,
}: TreeItemProps) {
  const isExpanded = filter
    ? filterMatchIds.has(node.id)
    : expanded.has(node.id);
  const hasChildren = node.children.length > 0;

  // When filtering, hide non-matching branches
  if (filter && !filterMatchIds.has(node.id)) return null;

  const dotColor =
    node.section === "type"
      ? node.color ?? NEUTRAL_DOT
      : node.section === "binding"
        ? (node.color ?? NEUTRAL_DOT)
        : NEUTRAL_DOT;

  const isClickable = node.section === "type" || node.section === "permission";

  return (
    <div>
      <div
        className="flex items-center gap-1.5 py-0.5 px-2 text-xs cursor-pointer select-none group overflow-hidden"
        style={{
          paddingLeft: depth * 16 + 8,
          cursor: isClickable ? "pointer" : "default",
        }}
        onClick={() => {
          if (hasChildren && !filter) toggleExpanded(node.id);
          if (isClickable) onNodeClick(node.id, node.section);
        }}
        onMouseEnter={() => onNodeHover(node.id, node.section)}
        onMouseLeave={onNodeLeave}
      >
        {/* Chevron */}
        {hasChildren ? (
          <span
            className="inline-flex items-center justify-center w-3 h-3 flex-shrink-0 transition-transform duration-150"
            style={{
              transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
              color: blueprint.muted,
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (!filter) toggleExpanded(node.id);
            }}
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path
                d="M2 1L6 4L2 7"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        ) : (
          <span className="w-3 flex-shrink-0" />
        )}

        {/* Color dot */}
        <span
          className="flex-shrink-0"
          style={{
            display: "inline-block",
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: dotColor,
          }}
        />

        {/* Label */}
        <span
          className="whitespace-nowrap group-hover:text-slate-100 transition-colors duration-100"
          style={{
            color: node.section === "type" ? blueprint.nodeHeader : "#cbd5e1",
            fontWeight: node.section === "type" ? 600 : 400,
            fontFamily:
              node.section === "type" ? "inherit" : "ui-monospace, monospace",
            fontSize: node.section === "type" ? "0.8rem" : "0.7rem",
          }}
        >
          {node.label}
        </span>

        {/* Expression */}
        {node.expression != null && (
          <TruncationTooltip
            text={node.expression}
            className="ml-1 whitespace-nowrap overflow-hidden text-ellipsis min-w-0 flex-1"
            style={{
              color: blueprint.muted,
              fontSize: "0.65rem",
              fontFamily: "ui-monospace, monospace",
            }}
          />
        )}
      </div>

      {/* Children */}
      {isExpanded &&
        hasChildren &&
        node.children.map((child) => (
          <TreeItem
            key={child.id}
            node={child}
            expanded={expanded}
            toggleExpanded={toggleExpanded}
            filter={filter}
            filterMatchIds={filterMatchIds}
            onNodeClick={onNodeClick}
            onNodeHover={onNodeHover}
            onNodeLeave={onNodeLeave}
            depth={depth + 1}
          />
        ))}
    </div>
  );
}

const TreeItem = memo(TreeItemComponent);

// ─── InspectContent ──────────────────────────────────────────────────────────
// Content-only component: filter input, tree area, and navigation footer.
// Intended to be rendered inside a tabbed container (EditorPanel).

const InspectContent = () => {
  // Store subscriptions
  const nodes = useViewerStore((s) => s.nodes);
  const dimensions = useViewerStore((s) => s.dimensions);
  const navigationStack = useViewerStore((s) => s.navigationStack);
  const navigateToSubgraph = useViewerStore((s) => s.navigateToSubgraph);

  // Full graph refs for hover BFS
  const fullNodes = useViewerStore((s) => s.nodes);
  const fullEdges = useViewerStore((s) => s.edges);

  // Hover actions
  const setHoveredRow = useHoverStore((s) => s.setHoveredRow);
  const setHoveredCard = useHoverStore((s) => s.setHoveredCard);
  const clearHover = useHoverStore((s) => s.clearHover);

  // Local state
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  // Current navigation frame
  const currentFrame = navigationStack.length > 0
    ? navigationStack[navigationStack.length - 1]
    : null;

  // Build tree data
  const tree = useMemo(() => {
    if (currentFrame) {
      return buildSubgraphTree(
        nodes,
        dimensions,
        currentFrame.visibleTypeIds,
        currentFrame.relevantRowIds,
        currentFrame.entryNodeId,
      );
    }
    return buildOverviewTree(nodes, dimensions);
  }, [nodes, dimensions, currentFrame]);

  // Default expand: all types expanded at overview, entry type at subgraph
  useMemo(() => {
    const defaults = new Set<string>();
    if (currentFrame) {
      // Expand the entry type
      defaults.add(currentFrame.entryNodeId.split("#")[0]);
    } else {
      // Expand all types at overview
      for (const t of tree) defaults.add(t.id);
    }
    setExpanded(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFrame, tree.length]);

  // Filter matching ancestors for auto-expand
  const filterMatchIds = useMemo(() => {
    if (!filter) return new Set<string>();
    return collectMatchingAncestors(tree, filter);
  }, [tree, filter]);

  const toggleExpanded = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleNodeClick = useCallback(
    (id: string, section: TreeNode["section"]) => {
      if (section === "type") {
        navigateToSubgraph(id, "downstream");
      } else if (section === "permission" || section === "relation") {
        navigateToSubgraph(id, "upstream");
      }
    },
    [navigateToSubgraph],
  );

  const handleNodeHover = useCallback(
    (id: string, section: TreeNode["section"]) => {
      if (section === "type") {
        setHoveredCard(id, fullNodes, fullEdges);
      } else {
        setHoveredRow(id, fullEdges);
      }
    },
    [setHoveredCard, setHoveredRow, fullNodes, fullEdges],
  );

  const handleNodeLeave = useCallback(() => {
    clearHover();
  }, [clearHover]);

  return (
    <>
      {/* Filter input */}
      <div className="px-3 py-2 flex-shrink-0" style={{ borderBottom: "1px solid #2a3a5c" }}>
        <div className="relative">
          <svg
            width="12"
            height="12"
            viewBox="0 0 14 14"
            fill="none"
            className="absolute left-2 top-1/2 -translate-y-1/2"
            style={{ color: blueprint.muted }}
          >
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter..."
            className="w-full text-xs py-1 pl-7 pr-2 rounded"
            style={{
              background: "rgba(15, 23, 42, 0.6)",
              border: "1px solid #2a3a5c",
              color: "#cbd5e1",
              outline: "none",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = blueprint.accent;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#2a3a5c";
            }}
          />
        </div>
      </div>

      {/* Tree area */}
      <div className="flex-1 overflow-y-auto py-1 scrollbar-dark">
        {tree.length === 0 ? (
          <div
            className="px-3 py-4 text-xs text-center"
            style={{ color: blueprint.muted }}
          >
            No types to display
          </div>
        ) : (
          tree
            .filter((t) => !filter || matchesFilter(t, filter))
            .map((t) => (
              <TreeItem
                key={t.id}
                node={t}
                expanded={expanded}
                toggleExpanded={toggleExpanded}
                filter={filter}
                filterMatchIds={filterMatchIds}
                onNodeClick={handleNodeClick}
                onNodeHover={handleNodeHover}
                onNodeLeave={handleNodeLeave}
                depth={0}
              />
            ))
        )}
      </div>

      {/* Footer - navigation context */}
      {currentFrame && (
        <div
          className="px-3 py-1.5 text-[10px] flex-shrink-0"
          style={{
            borderTop: "1px solid #2a3a5c",
            color: blueprint.muted,
          }}
        >
          Viewing: {currentFrame.label}
          {" "}
          <span style={{ color: blueprint.accent }}>
            ({currentFrame.direction})
          </span>
        </div>
      )}
    </>
  );
};

export default InspectContent;
