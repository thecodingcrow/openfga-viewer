import type {
  AuthorizationNode,
  AuthorizationEdge,
  GraphFilters,
  SelfReferencingDimension,
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
  const queue: { path: string[]; visited: Set<string> }[] = [
    { path: [startId], visited: new Set([startId]) },
  ];

  while (queue.length > 0) {
    const { path, visited } = queue.shift()!;
    const current = path[path.length - 1];

    if (path.length > maxDepth + 1) continue;

    const neighbors = adjacency.get(current) ?? [];
    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) continue;
      const extended = [...path, neighbor];
      if (neighbor === endId) {
        paths.push(extended);
      } else {
        const nextVisited = new Set(visited);
        nextVisited.add(neighbor);
        queue.push({ path: extended, visited: nextVisited });
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

  // Pre-build edge lookup: "source|target" → edge IDs (both directions)
  const edgeLookup = new Map<string, string[]>();
  for (const edge of edges) {
    const fwd = `${edge.source}|${edge.target}`;
    const rev = `${edge.target}|${edge.source}`;
    if (!edgeLookup.has(fwd)) edgeLookup.set(fwd, []);
    if (!edgeLookup.has(rev)) edgeLookup.set(rev, []);
    edgeLookup.get(fwd)!.push(edge.id);
    edgeLookup.get(rev)!.push(edge.id);
  }

  for (const path of paths) {
    for (const nodeId of path) nodeIds.add(nodeId);
    for (let i = 0; i < path.length - 1; i++) {
      const key = `${path[i]}|${path[i + 1]}`;
      const matched = edgeLookup.get(key);
      if (matched) {
        for (const id of matched) edgeIds.add(id);
      }
    }
  }

  return { nodeIds, edgeIds };
}

// ─── TTU hover expansion ────────────────────────────────────────────────────

/**
 * Expand a hovered node via TTU (tupleToUserset) edges.
 * Returns the set of all node IDs reachable from `centerId` by
 * following TTU edges bidirectionally (BFS).
 */
export function expandViaTtu(
  centerId: string,
  allEdges: AuthorizationEdge[],
): Set<string> {
  const adjacency = new Map<string, string[]>();
  for (const edge of allEdges) {
    if (edge.rewriteRule !== "ttu") continue;
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, []);
    adjacency.get(edge.source)!.push(edge.target);
    adjacency.get(edge.target)!.push(edge.source);
  }

  const visited = new Set<string>([centerId]);
  const queue = [centerId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const neighbor of adjacency.get(current) ?? []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return visited;
}

// ─── Row-level hover tracing ─────────────────────────────────────────────────

/**
 * Trace upstream from a row (permission/relation).
 * BFS backward through cross-card edges only (direct + ttu).
 * Follows edges where `edge.target === currentId`, collects `edge.source`.
 * Returns all visited node IDs, edge IDs, and row IDs.
 */
export function traceUpstream(
  startRowId: string,
  edges: AuthorizationEdge[],
): { nodeIds: Set<string>; edgeIds: Set<string>; rowIds: Set<string> } {
  const nodeIds = new Set<string>([startRowId]);
  const edgeIds = new Set<string>();
  const rowIds = new Set<string>([startRowId]);
  const queue = [startRowId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of edges) {
      if (edge.rewriteRule !== "direct" && edge.rewriteRule !== "ttu") continue;
      if (edge.target !== current) continue;
      if (nodeIds.has(edge.source)) {
        edgeIds.add(edge.id);
        continue;
      }
      nodeIds.add(edge.source);
      rowIds.add(edge.source);
      edgeIds.add(edge.id);
      queue.push(edge.source);
    }
  }

  return { nodeIds, edgeIds, rowIds };
}

/**
 * Trace downstream from a type card (header hover).
 * Collects all relations/permissions belonging to the type, then BFS forward
 * through cross-card edges (direct + ttu).
 * Returns all visited node IDs, edge IDs, and row IDs.
 */
export function traceDownstream(
  startTypeId: string,
  nodes: AuthorizationNode[],
  edges: AuthorizationEdge[],
): { nodeIds: Set<string>; edgeIds: Set<string>; rowIds: Set<string> } {
  // Start with all rows belonging to the given type, plus the type node itself.
  // The type node ID must be included because type-restriction edges
  // (e.g., [user]) originate from the type node as source.
  const seedIds = nodes
    .filter((n) => n.type === startTypeId && n.kind !== "type")
    .map((n) => n.id);
  seedIds.push(startTypeId);

  const nodeIds = new Set<string>(seedIds);
  const edgeIds = new Set<string>();
  const rowIds = new Set<string>(seedIds);
  const queue = [...seedIds];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of edges) {
      if (edge.rewriteRule !== "direct" && edge.rewriteRule !== "ttu") continue;
      if (edge.source !== current) continue;
      edgeIds.add(edge.id);
      if (nodeIds.has(edge.target)) continue;
      nodeIds.add(edge.target);
      rowIds.add(edge.target);
      queue.push(edge.target);
    }
  }

  return { nodeIds, edgeIds, rowIds };
}

// ─── Subgraph navigation ─────────────────────────────────────────────────────

/**
 * Compute subgraph for drill-in navigation (separate from hover trace).
 *
 * Unified single-phase BFS that follows ALL four edge types (direct, ttu,
 * computed, tupleset-dep) in the correct direction. This naturally interleaves
 * cross-card hops (direct, ttu) and intra-card hops (computed, tupleset-dep)
 * because they all use the same node ID space.
 *
 * For downstream navigation from a type header, seeds with all rows of that
 * type + the type node itself (since no edges connect a type node to its own
 * rows directly).
 *
 * `visibleTypeIds` controls which cards render (all rows shown).
 * `relevantRowIds` controls brightness — rows NOT in this set render dimmed.
 */
export function computeSubgraph(
  startNodeId: string,
  direction: "upstream" | "downstream",
  nodes: AuthorizationNode[],
  edges: AuthorizationEdge[],
): { visibleTypeIds: Set<string>; relevantRowIds: Set<string> } {
  // For downstream from a type header, seed with all rows of that type + the type node
  let seeds: string[];
  if (direction === "downstream") {
    seeds = nodes
      .filter((n) => n.type === startNodeId && n.kind !== "type")
      .map((n) => n.id);
    seeds.push(startNodeId);
  } else {
    seeds = [startNodeId];
  }

  const relevantRowIds = new Set<string>(seeds);
  const queue = [...seeds];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of edges) {
      const matchField = direction === "upstream" ? edge.target : edge.source;
      const candidate = direction === "upstream" ? edge.source : edge.target;

      if (matchField !== current) continue;
      if (relevantRowIds.has(candidate)) continue;

      relevantRowIds.add(candidate);
      queue.push(candidate);
    }
  }

  const visibleTypeIds = new Set<string>();
  for (const nid of relevantRowIds) {
    visibleTypeIds.add(nid.split("#")[0]);
  }

  return { visibleTypeIds, relevantRowIds };
}

// ─── Filtering ──────────────────────────────────────────────────────────────

/**
 * Apply type filters to the graph.
 * Returns original node/edge refs when no filters are active (referential stability).
 */
export function applyFilters(
  nodes: AuthorizationNode[],
  edges: AuthorizationEdge[],
  filters: GraphFilters,
): { nodes: AuthorizationNode[]; edges: AuthorizationEdge[] } {
  const noTypeFilter = filters.types.length === 0;

  if (noTypeFilter) {
    return { nodes, edges };
  }

  const typeSet = new Set(filters.types);
  const filtered = nodes.filter((n) => typeSet.has(n.type));

  const nodeIds = new Set(filtered.map((n) => n.id));
  const filteredEdges = edges.filter(
    (e) => nodeIds.has(e.source) && nodeIds.has(e.target),
  );

  return {
    nodes: filtered,
    edges: filteredEdges,
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

// ─── Self-referencing dimension detection ────────────────────────────────────

/**
 * Detect dimensions where a type references itself via a TTU edge.
 * e.g., category#parent -> category (parent category hierarchy).
 * Returns an array of SelfReferencingDimension objects.
 */
export function detectSelfReferencingDimensions(
  edges: AuthorizationEdge[],
): SelfReferencingDimension[] {
  const seen = new Set<string>();
  const results: SelfReferencingDimension[] = [];

  for (const edge of edges) {
    if (edge.rewriteRule !== "ttu" || !edge.tuplesetRelation) continue;

    const sourceType = edge.source.split("#")[0];
    const targetType = edge.target.split("#")[0];

    if (sourceType !== targetType) continue;

    const key = `${edge.tuplesetRelation}|${sourceType}`;
    if (seen.has(key)) continue;
    seen.add(key);

    results.push({
      dimensionName: edge.tuplesetRelation,
      typeName: sourceType,
      tooltip: `Permission can be inherited from parent ${edge.tuplesetRelation}s`,
    });
  }

  return results;
}
