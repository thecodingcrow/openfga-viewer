import type { AuthorizationNode, AuthorizationEdge } from "../types";
import type {
  ResolutionBranch,
  ResolutionResult,
} from "./resolution-types";

/**
 * Check if a node is terminal — no upstream edges with computed/TTU/tupleset-dep
 * rewrite rules feeding into it. A terminal node only receives direct type
 * restriction edges or no upstream edges at all.
 */
function isTerminalNode(nodeId: string, edges: AuthorizationEdge[]): boolean {
  for (const edge of edges) {
    if (edge.target !== nodeId) continue;
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
 * BFS upstream through ALL edge types (direct, computed, TTU, tupleset-dep).
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

  function buildBranches(
    currentId: string,
    visited: Set<string>,
  ): ResolutionBranch[] {
    const branches: ResolutionBranch[] = [];

    for (const edge of edges) {
      if (edge.target !== currentId) continue;

      const sourceId = edge.source;
      if (visited.has(sourceId)) continue;

      const sourceNode = nodeMap.get(sourceId);
      if (!sourceNode) continue;

      const terminal = isTerminalNode(sourceId, edges);
      const branchVisited = new Set(visited);
      branchVisited.add(sourceId);

      const children = terminal
        ? []
        : buildBranches(sourceId, branchVisited);

      branches.push({
        nodeId: sourceId,
        type: sourceNode.type,
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
