import type { AuthorizationNode, AuthorizationEdge } from "../types";
import type {
  CheckResult,
  ResolutionBranch,
  ResolutionResult,
  RoleAuditResult,
} from "./resolution-types";

/**
 * Check if a node is terminal — no upstream edges with computed/TTU/tupleset-dep
 * rewrite rules feeding into it. A terminal node only receives direct type
 * restriction edges or no upstream edges at all.
 */
function isTerminalNode(
  nodeId: string,
  inboundEdges: Map<string, AuthorizationEdge[]>,
): boolean {
  const edges = inboundEdges.get(nodeId);
  if (!edges) return true;
  for (const edge of edges) {
    if (
      edge.rewriteRule === "computed" ||
      edge.rewriteRule === "ttu" ||
      edge.rewriteRule === "tupleset-dep"
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Resolve a permission's full upstream dependency tree.
 *
 * DFS upstream through ALL edge types (direct, computed, TTU, tupleset-dep).
 * Walks until reaching terminal nodes — relations that only have direct type
 * restrictions and no further upstream computed/TTU edges.
 *
 * Uses per-branch visited sets so the same node can appear in multiple branches
 * but not in the same branch twice (cycle protection).
 */
export function resolvePermission(
  permissionNodeId: string,
  nodes: AuthorizationNode[],
  edges: AuthorizationEdge[],
): ResolutionResult {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Pre-compute inbound edges keyed by target node ID to avoid repeated scans
  const inboundEdges = new Map<string, AuthorizationEdge[]>();
  for (const edge of edges) {
    const existing = inboundEdges.get(edge.target);
    if (existing) {
      existing.push(edge);
    } else {
      inboundEdges.set(edge.target, [edge]);
    }
  }

  function buildBranches(
    currentId: string,
    visited: Set<string>,
  ): ResolutionBranch[] {
    const branches: ResolutionBranch[] = [];
    const currentInbound = inboundEdges.get(currentId);
    if (!currentInbound) return branches;

    for (const edge of currentInbound) {
      const sourceId = edge.source;
      if (visited.has(sourceId)) continue;

      const sourceNode = nodeMap.get(sourceId);
      if (!sourceNode) continue;

      const terminal = isTerminalNode(sourceId, inboundEdges);
      const branchVisited = new Set(visited);
      branchVisited.add(sourceId);

      const children = terminal
        ? []
        : buildBranches(sourceId, branchVisited);

      branches.push({
        nodeId: sourceId,
        type: sourceNode.type,
        // Type-only nodes (kind: "type") can be edge sources for direct type
        // restrictions — they have no relation, so fall back to the type name.
        relation: sourceNode.relation ?? sourceNode.type,
        edgeType: edge.rewriteRule,
        children,
        isTerminal: terminal,
      });
    }

    return branches;
  }

  const tree = buildBranches(permissionNodeId, new Set([permissionNodeId]));

  // Build summary: collect all terminal nodes grouped by type
  const summary = new Map<string, string[]>();
  function collectTerminals(branches: ResolutionBranch[]): void {
    for (const branch of branches) {
      if (branch.isTerminal) {
        const existing = summary.get(branch.type);
        if (existing) {
          if (!existing.includes(branch.relation)) {
            existing.push(branch.relation);
          }
        } else {
          summary.set(branch.type, [branch.relation]);
        }
      }
      collectTerminals(branch.children);
    }
  }
  collectTerminals(tree);

  return { permissionId: permissionNodeId, tree, summary };
}

/**
 * Build an outbound adjacency map keyed by source node ID.
 * Mirror of the inbound map pattern used in resolvePermission.
 */
function buildOutboundEdges(
  edges: AuthorizationEdge[],
): Map<string, AuthorizationEdge[]> {
  const outbound = new Map<string, AuthorizationEdge[]>();
  for (const edge of edges) {
    const existing = outbound.get(edge.source);
    if (existing) {
      existing.push(edge);
    } else {
      outbound.set(edge.source, [edge]);
    }
  }
  return outbound;
}

/**
 * Audit a role by collecting all downstream permissions reachable from it.
 *
 * BFS downstream through all edge types. Collects every node where
 * `isPermission === true`, grouped by FGA type name.
 */
export function auditRole(
  roleNodeId: string,
  nodes: AuthorizationNode[],
  edges: AuthorizationEdge[],
): RoleAuditResult {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const outboundEdges = buildOutboundEdges(edges);
  const visited = new Set<string>([roleNodeId]);
  const queue = [roleNodeId];
  const permissions = new Map<string, string[]>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    const outbound = outboundEdges.get(current);
    if (!outbound) continue;

    for (const edge of outbound) {
      if (visited.has(edge.target)) continue;
      visited.add(edge.target);
      queue.push(edge.target);

      const targetNode = nodeMap.get(edge.target);
      if (targetNode?.isPermission && targetNode.relation) {
        const existing = permissions.get(targetNode.type);
        if (existing) {
          if (!existing.includes(targetNode.relation)) {
            existing.push(targetNode.relation);
          }
        } else {
          permissions.set(targetNode.type, [targetNode.relation]);
        }
      }
    }
  }

  return { roleId: roleNodeId, permissions };
}

/**
 * Check if a permission is reachable from a role via BFS downstream.
 *
 * If reachable, returns the shortest path (node IDs in order).
 * If not reachable, returns all permission relation names on the same type
 * as the target that ARE reachable.
 */
export function checkPermission(
  roleNodeId: string,
  permissionNodeId: string,
  nodes: AuthorizationNode[],
  edges: AuthorizationEdge[],
): CheckResult {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const targetNode = nodeMap.get(permissionNodeId);
  const targetType = targetNode?.type;
  const outboundEdges = buildOutboundEdges(edges);

  const visited = new Set<string>([roleNodeId]);
  const parent = new Map<string, string>();
  const queue = [roleNodeId];
  let found = false;

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === permissionNodeId) {
      found = true;
      break;
    }
    const outbound = outboundEdges.get(current);
    if (!outbound) continue;

    for (const edge of outbound) {
      if (visited.has(edge.target)) continue;
      visited.add(edge.target);
      parent.set(edge.target, current);
      queue.push(edge.target);
    }
  }

  if (found) {
    const path: string[] = [];
    let cur: string | undefined = permissionNodeId;
    while (cur !== undefined) {
      path.push(cur);
      cur = parent.get(cur);
    }
    path.reverse();
    return { reachable: true, path, reachableOnSameType: [] };
  }

  // Not reachable — find permissions on the same type that are reachable
  const reachableOnSameType: string[] = [];
  if (targetType) {
    for (const visitedId of visited) {
      const node = nodeMap.get(visitedId);
      if (
        node &&
        node.isPermission &&
        node.type === targetType &&
        node.relation
      ) {
        reachableOnSameType.push(node.relation);
      }
    }
  }

  return { reachable: false, path: null, reachableOnSameType };
}
