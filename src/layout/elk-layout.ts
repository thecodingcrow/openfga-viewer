import ELK from 'elkjs/lib/elk.bundled.js';
import type { Node, Edge } from '@xyflow/react';
import type { ElkNode, ElkExtendedEdge, ElkEdgeSection } from 'elkjs';
import type { Point } from './elk-path';

const elk = new ELK();

export interface ElkRoute {
  points: Point[];
}

// -- Layout cache (LRU, max 5) -----------------------------------------------

interface CacheEntry {
  key: string;
  nodes: Node[];
  edges: Edge[];
}

const layoutCache: CacheEntry[] = [];
const CACHE_MAX = 5;

function buildCacheKey(
  nodes: Node[],
  edges: Edge[],
  direction: string,
): string {
  const nodeKeys = nodes
    .map((n) => `${n.id}:${n.measured?.width ?? 280}:${n.measured?.height ?? 100}`)
    .sort()
    .join(',');
  const edgeKeys = edges
    .map((e) => e.id)
    .sort()
    .join(',');
  return `${direction}|${nodeKeys}|${edgeKeys}`;
}

function getCached(key: string): CacheEntry | undefined {
  const idx = layoutCache.findIndex((e) => e.key === key);
  if (idx === -1) return undefined;
  const [entry] = layoutCache.splice(idx, 1);
  layoutCache.unshift(entry);
  return entry;
}

function putCache(entry: CacheEntry): void {
  layoutCache.unshift(entry);
  if (layoutCache.length > CACHE_MAX) layoutCache.pop();
}

// -- Helper -------------------------------------------------------------------

function extractPointsFromSections(sections: ElkEdgeSection[]): Point[] {
  const points: Point[] = [];
  for (const section of sections) {
    points.push({ x: section.startPoint.x, y: section.startPoint.y });
    for (const bp of section.bendPoints ?? []) {
      points.push({ x: bp.x, y: bp.y });
    }
    points.push({ x: section.endPoint.x, y: section.endPoint.y });
  }
  return points;
}

// -- Public API ---------------------------------------------------------------

/** Fixed dimensions for CompactTypeNode */
const COMPACT_NODE_W = 120;
const COMPACT_NODE_H = 40;

/**
 * V2 layout for compact type nodes — no ports, fixed dimensions.
 * Uses the same ELK layered algorithm and LRU cache.
 */
export async function getLayoutedElementsV2(
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB',
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  const cacheKey = buildCacheKey(nodes, edges, `v2-${direction}`);
  const cached = getCached(cacheKey);
  if (cached) return { nodes: cached.nodes, edges: cached.edges };

  const nodeIds = new Set(nodes.map((n) => n.id));
  const validEdges = edges.filter(
    (e) => nodeIds.has(e.source) && nodeIds.has(e.target),
  );

  const isTB = direction === 'TB';

  const elkChildren: ElkNode[] = nodes.map((node) => ({
    id: node.id,
    width: node.measured?.width ?? COMPACT_NODE_W,
    height: node.measured?.height ?? COMPACT_NODE_H,
  }));

  const elkEdges: ElkExtendedEdge[] = validEdges.map((edge) => ({
    id: edge.id,
    sources: [edge.source],
    targets: [edge.target],
  }));

  const elkGraph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': isTB ? 'DOWN' : 'RIGHT',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.spacing.nodeNode': '60',
      'elk.layered.spacing.nodeNodeBetweenLayers': '80',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.nodePlacement.favorStraightEdges': 'true',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
    },
    children: elkChildren,
    edges: elkEdges,
  };

  const laidOut = await elk.layout(elkGraph);

  // Map positions back
  const elkNodeMap = new Map<string, ElkNode>();
  for (const child of laidOut.children ?? []) {
    elkNodeMap.set(child.id, child);
  }

  const positionedNodes = nodes.map((node) => {
    const elkNode = elkNodeMap.get(node.id);
    return {
      ...node,
      position: {
        x: elkNode?.x ?? 0,
        y: elkNode?.y ?? 0,
      },
    };
  });

  // Extract edge routes
  const allElkEdges: ElkExtendedEdge[] = [];
  for (const e of laidOut.edges ?? []) allElkEdges.push(e as ElkExtendedEdge);

  const edgeRoutes = new Map<string, ElkRoute>();
  for (const extEdge of allElkEdges) {
    const sections = extEdge.sections ?? [];
    const points = extractPointsFromSections(sections);
    if (points.length >= 2) {
      edgeRoutes.set(extEdge.id ?? '', { points });
    }
  }

  const enrichedEdges = edges.map((edge) => {
    const route = edgeRoutes.get(edge.id);
    return {
      ...edge,
      data: {
        ...edge.data,
        ...(route ? { elkRoute: route } : {}),
      },
    };
  });

  putCache({ key: cacheKey, nodes: positionedNodes, edges: enrichedEdges });
  return { nodes: positionedNodes, edges: enrichedEdges };
}
