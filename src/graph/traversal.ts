import type {
  AuthorizationNode,
  AuthorizationEdge,
  GraphFilters,
} from "../types";

// ─── Neighborhood (focus mode) ──────────────────────────────────────────────

/**
 * Extract the k-hop neighborhood around a center node.
 * Follows edges in both directions (incoming + outgoing).
 */
export function computeNeighborhood(
  nodes: AuthorizationNode[],
  edges: AuthorizationEdge[],
  centerId: string,
  hops: number = 1,
): { nodes: AuthorizationNode[]; edges: AuthorizationEdge[] } {
  const visited = new Set<string>([centerId]);
  let frontier = new Set<string>([centerId]);

  for (let hop = 0; hop < hops; hop++) {
    const next = new Set<string>();
    for (const edge of edges) {
      if (frontier.has(edge.source) && !visited.has(edge.target)) {
        next.add(edge.target);
        visited.add(edge.target);
      }
      if (frontier.has(edge.target) && !visited.has(edge.source)) {
        next.add(edge.source);
        visited.add(edge.source);
      }
    }
    frontier = next;
    if (frontier.size === 0) break;
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  return {
    nodes: [...visited]
      .map((id) => nodeMap.get(id))
      .filter((n): n is AuthorizationNode => n !== undefined),
    edges: edges.filter(
      (e) => visited.has(e.source) && visited.has(e.target),
    ),
  };
}

// ─── Path tracing ───────────────────────────────────────────────────────────

/**
 * Find all simple paths from `startId` to `endId` via BFS.
 * Returns arrays of node IDs representing each path.
 * Follows edges in both directions.
 */
export function findPaths(
  edges: AuthorizationEdge[],
  startId: string,
  endId: string,
  maxDepth: number = 10,
): string[][] {
  if (startId === endId) return [];

  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, []);
    adjacency.get(edge.source)!.push(edge.target);
    adjacency.get(edge.target)!.push(edge.source);
  }

  const paths: string[][] = [];
  const queue: string[][] = [[startId]];

  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path[path.length - 1];

    if (path.length > maxDepth + 1) continue;

    const neighbors = adjacency.get(current) ?? [];
    for (const neighbor of neighbors) {
      if (path.includes(neighbor)) continue;
      const extended = [...path, neighbor];
      if (neighbor === endId) {
        paths.push(extended);
      } else {
        queue.push(extended);
      }
    }
  }

  return paths;
}

/**
 * Collect all node and edge IDs that lie on any of the given paths.
 */
export function collectPathElements(
  edges: AuthorizationEdge[],
  paths: string[][],
): { nodeIds: Set<string>; edgeIds: Set<string> } {
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();

  for (const path of paths) {
    for (const nodeId of path) nodeIds.add(nodeId);
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b = path[i + 1];
      for (const edge of edges) {
        if (
          (edge.source === a && edge.target === b) ||
          (edge.source === b && edge.target === a)
        ) {
          edgeIds.add(edge.id);
        }
      }
    }
  }

  return { nodeIds, edgeIds };
}

// ─── Filtering ──────────────────────────────────────────────────────────────

/**
 * Apply type and permission filters to the graph.
 * Returns original node/edge refs when no filters are active (referential stability).
 */
export function applyFilters(
  nodes: AuthorizationNode[],
  edges: AuthorizationEdge[],
  filters: GraphFilters,
): { nodes: AuthorizationNode[]; edges: AuthorizationEdge[] } {
  const noTypeFilter = filters.types.length === 0;
  const noPermissionFilter = !filters.permissionsOnly;

  if (noTypeFilter && noPermissionFilter) {
    return { nodes, edges };
  }

  let filtered = nodes;

  if (!noTypeFilter) {
    const typeSet = new Set(filters.types);
    filtered = filtered.filter((n) => typeSet.has(n.type));
  }

  if (!noPermissionFilter) {
    filtered = filtered.filter((n) => n.kind === "type" || n.isPermission);
  }

  const nodeIds = new Set(filtered.map((n) => n.id));
  return {
    nodes: filtered,
    edges: edges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target),
    ),
  };
}

// ─── Depth layers ───────────────────────────────────────────────────────────

/**
 * Compute dependency-depth for each node (Kahn's algorithm).
 * L0 = nodes with no incoming edges (leaf types like `user`).
 * Recursive self-edges are ignored for layering.
 */
export function computeDepthLayers(
  nodes: AuthorizationNode[],
  edges: AuthorizationEdge[],
): Map<string, number> {
  const nonSelfEdges = edges.filter((e) => e.source !== e.target);

  const inDegree = new Map<string, number>();
  for (const node of nodes) inDegree.set(node.id, 0);
  for (const edge of nonSelfEdges) {
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const depths = new Map<string, number>();
  const queue: string[] = [];

  for (const [id, degree] of inDegree) {
    if (degree === 0) {
      queue.push(id);
      depths.set(id, 0);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDepth = depths.get(current)!;

    for (const edge of nonSelfEdges) {
      if (edge.source !== current) continue;
      const newDepth = currentDepth + 1;
      if (newDepth > (depths.get(edge.target) ?? -1)) {
        depths.set(edge.target, newDepth);
      }
      const remaining = inDegree.get(edge.target)! - 1;
      inDegree.set(edge.target, remaining);
      if (remaining === 0) {
        queue.push(edge.target);
      }
    }
  }

  // Nodes in cycles get the max observed depth
  const maxDepth =
    depths.size > 0 ? Math.max(...depths.values()) : 0;
  for (const node of nodes) {
    if (!depths.has(node.id)) depths.set(node.id, maxDepth);
  }

  return depths;
}

// ─── Unique types extractor ─────────────────────────────────────────────────

/** Extract sorted unique type names from the node set */
export function extractTypeNames(nodes: AuthorizationNode[]): string[] {
  return [...new Set(nodes.map((n) => n.type))].sort();
}
