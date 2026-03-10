import type { Node, Edge } from "@xyflow/react";
import type { Anchor } from "../types";
import type { ResolutionBranch } from "../graph/resolution-types";
import type { ExploreNodeData } from "./nodes/ExploreNode";

/**
 * Convert an Anchor's result data into React Flow nodes and edges
 * for the exploration graph.
 */
export function anchorToFlowElements(
  anchor: Anchor,
): { nodes: Node[]; edges: Edge[] } {
  switch (anchor.kind) {
    case "permission":
      return permissionResolutionToFlow(anchor.nodeId, anchor.result.tree);
    case "role":
      return roleAuditToFlow(anchor.nodeId, anchor.result.permissions);
    case "checker":
      return checkerToFlow(anchor);
  }
}

// ─── Permission Resolution ────────────────────────────────────────────────

function permissionResolutionToFlow(
  rootNodeId: string,
  tree: ResolutionBranch[],
): { nodes: Node[]; edges: Edge[] } {
  const flowNodes: Node[] = [];
  const flowEdges: Edge[] = [];
  const seenNodes = new Set<string>();
  const seenEdges = new Set<string>();

  // Root node (the permission being resolved)
  const [rootType, rootRelation] = rootNodeId.split("#");
  flowNodes.push({
    id: rootNodeId,
    type: "explore",
    position: { x: 0, y: 0 },
    data: {
      relation: rootRelation,
      typeName: rootType,
      isTerminal: false,
      isRoot: true,
      isPermission: true,
    } satisfies ExploreNodeData,
  });
  seenNodes.add(rootNodeId);

  // Walk the tree
  function walkBranch(branch: ResolutionBranch, parentId: string): void {
    // Deduplicate nodes (same nodeId can appear in different branches)
    if (!seenNodes.has(branch.nodeId)) {
      seenNodes.add(branch.nodeId);
      flowNodes.push({
        id: branch.nodeId,
        type: "explore",
        position: { x: 0, y: 0 },
        data: {
          relation: branch.relation,
          typeName: branch.type,
          edgeType: branch.edgeType === "tupleset-dep" ? "tupleset" : branch.edgeType,
          isTerminal: branch.isTerminal,
          isRoot: false,
          isPermission: branch.relation.startsWith("can_"),
        } satisfies ExploreNodeData,
      });
    }

    // Deduplicate edges (same parent→child can occur in multiple branches)
    const edgeId = `explore-${parentId}-${branch.nodeId}`;
    if (!seenEdges.has(edgeId)) {
      seenEdges.add(edgeId);
      flowEdges.push({
        id: edgeId,
        source: parentId,
        target: branch.nodeId,
        type: "dimension",
        data: {
          label: branch.edgeType === "tupleset-dep" ? "tupleset" : branch.edgeType,
          color: "var(--color-text-muted)",
        },
      });
    }

    // Recurse into children
    for (const child of branch.children) {
      walkBranch(child, branch.nodeId);
    }
  }

  for (const branch of tree) {
    walkBranch(branch, rootNodeId);
  }

  return { nodes: flowNodes, edges: flowEdges };
}

// ─── Role Audit ───────────────────────────────────────────────────────────

function roleAuditToFlow(
  rootNodeId: string,
  permissions: Map<string, string[]>,
): { nodes: Node[]; edges: Edge[] } {
  const flowNodes: Node[] = [];
  const flowEdges: Edge[] = [];

  const [rootType, rootRelation] = rootNodeId.split("#");

  // Root node (the role being audited)
  flowNodes.push({
    id: rootNodeId,
    type: "explore",
    position: { x: 0, y: 0 },
    data: {
      relation: rootRelation,
      typeName: rootType,
      isTerminal: false,
      isRoot: true,
      isPermission: false,
    } satisfies ExploreNodeData,
  });

  // Create a node for each reachable permission, edge from root
  for (const [typeName, perms] of permissions) {
    for (const perm of perms) {
      const permNodeId = `${typeName}#${perm}`;
      // Skip self-reference (role can "reach" itself)
      if (permNodeId === rootNodeId) continue;
      flowNodes.push({
        id: permNodeId,
        type: "explore",
        position: { x: 0, y: 0 },
        data: {
          relation: perm,
          typeName,
          isTerminal: true,
          isRoot: false,
          isPermission: true,
        } satisfies ExploreNodeData,
      });
      flowEdges.push({
        id: `explore-${rootNodeId}-${permNodeId}`,
        source: rootNodeId,
        target: permNodeId,
        type: "dimension",
        data: {
          label: "",
          color: "var(--color-text-muted)",
        },
      });
    }
  }

  return { nodes: flowNodes, edges: flowEdges };
}

// ─── Checker ──────────────────────────────────────────────────────────────

function checkerToFlow(
  anchor: Extract<Anchor, { kind: "checker" }>,
): { nodes: Node[]; edges: Edge[] } {
  const flowNodes: Node[] = [];
  const flowEdges: Edge[] = [];

  const path = anchor.result.path;
  if (!path || path.length === 0) {
    // Not reachable — show subject and target as disconnected nodes
    const [subType, subRel] = anchor.subjectNodeId.split("#");
    const [tgtType, tgtRel] = anchor.targetNodeId.split("#");
    flowNodes.push({
      id: anchor.subjectNodeId,
      type: "explore",
      position: { x: 0, y: 0 },
      data: {
        relation: subRel,
        typeName: subType,
        isTerminal: false,
        isRoot: true,
        isPermission: false,
      } satisfies ExploreNodeData,
    });
    flowNodes.push({
      id: anchor.targetNodeId,
      type: "explore",
      position: { x: 0, y: 0 },
      data: {
        relation: tgtRel,
        typeName: tgtType,
        isTerminal: true,
        isRoot: false,
        isPermission: tgtRel.startsWith("can_"),
      } satisfies ExploreNodeData,
    });
    return { nodes: flowNodes, edges: flowEdges };
  }

  // Show the path as a chain
  for (let i = 0; i < path.length; i++) {
    const nodeId = path[i];
    const [typeName, relation] = nodeId.split("#");
    flowNodes.push({
      id: nodeId,
      type: "explore",
      position: { x: 0, y: 0 },
      data: {
        relation: relation ?? typeName,
        typeName,
        isTerminal: i === path.length - 1,
        isRoot: i === 0,
        isPermission: (relation ?? "").startsWith("can_"),
      } satisfies ExploreNodeData,
    });
    if (i > 0) {
      flowEdges.push({
        id: `explore-${path[i - 1]}-${nodeId}`,
        source: path[i - 1],
        target: nodeId,
        type: "dimension",
        data: {
          label: "",
          color: "var(--color-text-muted)",
        },
      });
    }
  }

  return { nodes: flowNodes, edges: flowEdges };
}
