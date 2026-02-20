import ELK from 'elkjs/lib/elk.bundled.js';
import type { Node, Edge } from '@xyflow/react';
import type { ElkNode, ElkExtendedEdge, ElkEdgeSection } from 'elkjs';
import type { Point } from './elk-path';
import { trimPathToHandles, type NodeBounds } from './elk-path';

const elk = new ELK();

export interface ElkRoute {
  points: Point[];
}

// ─── Layout cache (LRU, max 5) ─────────────────────────────────────────────

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
    .map((n) => `${n.id}:${n.measured?.width ?? 120}x${n.measured?.height ?? 40}`)
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
  // Move to front (most recently used)
  const [entry] = layoutCache.splice(idx, 1);
  layoutCache.unshift(entry);
  return entry;
}

function putCache(entry: CacheEntry): void {
  layoutCache.unshift(entry);
  if (layoutCache.length > CACHE_MAX) layoutCache.pop();
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB',
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  const cacheKey = buildCacheKey(nodes, edges, direction);
  const cached = getCached(cacheKey);
  if (cached) return { nodes: cached.nodes, edges: cached.edges };

  const count = nodes.length;
  const scale = count > 80 ? 1.5 : count > 40 ? 1.2 : 0.95;

  const nodeIds = new Set(nodes.map((n) => n.id));
  const validEdges = edges.filter(
    (e) => nodeIds.has(e.source) && nodeIds.has(e.target),
  );

  const elkGraph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': direction === 'TB' ? 'DOWN' : 'RIGHT',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.layered.spacing.nodeNodeBetweenLayers': String(Math.round(72 * scale)),
      'elk.spacing.nodeNode': String(Math.round(54 * scale)),
      'elk.layered.spacing.edgeEdgeBetweenLayers': '16',
      'elk.layered.spacing.edgeNodeBetweenLayers': '24',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
    },
    children: nodes.map((node) => {
      const w = node.measured?.width ?? 120;
      const h = node.measured?.height ?? 40;
      return {
        id: node.id,
        width: w,
        height: h,
      };
    }),
    edges: validEdges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  const laidOut = await elk.layout(elkGraph);

  const nodePositions = new Map<string, { x: number; y: number }>();
  const nodeBounds = new Map<string, NodeBounds>();
  for (const child of laidOut.children ?? []) {
    const x = child.x ?? 0;
    const y = child.y ?? 0;
    const w = child.width ?? 120;
    const h = child.height ?? 40;
    nodePositions.set(child.id, { x, y });
    nodeBounds.set(child.id, { x, y, width: w, height: h });
  }

  const edgeRoutes = new Map<string, ElkRoute>();
  for (const elkEdge of laidOut.edges ?? []) {
    const extEdge = elkEdge as ElkExtendedEdge;
    const points = extractPointsFromSections(extEdge.sections ?? []);
    if (points.length >= 2) {
      const edge = edges.find((e) => e.id === extEdge.id);
      if (edge && edge.source !== edge.target) {
        const sourceBounds = nodeBounds.get(edge.source);
        const targetBounds = nodeBounds.get(edge.target);
        const trimmed =
          sourceBounds && targetBounds
            ? trimPathToHandles(points, sourceBounds, targetBounds)
            : points;
        edgeRoutes.set(extEdge.id ?? '', { points: trimmed });
      } else {
        edgeRoutes.set(extEdge.id ?? '', { points });
      }
    }
  }

  const positionedNodes = nodes.map((node) => {
    const pos = nodePositions.get(node.id) ?? { x: 0, y: 0 };
    return { ...node, position: pos };
  });

  const enrichedEdges = edges.map((edge) => {
    const route = edgeRoutes.get(edge.id);
    const srcBounds = nodeBounds.get(edge.source);
    return {
      ...edge,
      data: {
        ...edge.data,
        ...(route ? { elkRoute: route } : {}),
        ...(edge.source === edge.target && srcBounds
          ? { sourceNodeWidth: srcBounds.width }
          : {}),
      },
    };
  });

  putCache({ key: cacheKey, nodes: positionedNodes, edges: enrichedEdges });
  return { nodes: positionedNodes, edges: enrichedEdges };
}

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
