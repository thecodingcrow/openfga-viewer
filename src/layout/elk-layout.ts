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

// -- Helpers ------------------------------------------------------------------

function fallbackW(n: Node): number {
  return n.measured?.width ?? (n.type === 'explore' ? EXPLORE_NODE_W : COMPACT_NODE_W);
}

function fallbackH(n: Node): number {
  return n.measured?.height ?? (n.type === 'explore' ? EXPLORE_NODE_H : COMPACT_NODE_H);
}

// -- Fan-out reflow -----------------------------------------------------------

const REFLOW_COL_GAP = 40;
const REFLOW_ROW_GAP = 60;

/**
 * After ELK layout, detect layers wider than the container and reflow
 * their nodes into a centered grid. Returns the set of edge IDs whose
 * elkRoutes should be dropped (edges touching reflowed nodes).
 */
function reflowWideLayers(
  nodes: Node[],
  containerWidth: number,
  isTB: boolean,
): { nodes: Node[]; invalidEdgeIds: Set<string> } | null {
  // Group nodes by their layer coordinate (y for TB, x for LR)
  const layerCoord = (n: Node) => Math.round(isTB ? n.position.y : n.position.x);
  const layers = new Map<number, Node[]>();
  for (const n of nodes) {
    const coord = layerCoord(n);
    const arr = layers.get(coord);
    if (arr) arr.push(n);
    else layers.set(coord, [n]);
  }

  const sortedLayers = [...layers.entries()].sort(([a], [b]) => a - b);
  let needsReflow = false;

  for (const [, layerNodes] of sortedLayers) {
    if (layerNodes.length <= 3) continue;
    layerNodes.sort((a, b) =>
      isTB ? a.position.x - b.position.x : a.position.y - b.position.y,
    );
    const first = layerNodes[0];
    const last = layerNodes[layerNodes.length - 1];
    const span = isTB
      ? (last.position.x + fallbackW(last)) - first.position.x
      : (last.position.y + fallbackH(last)) - first.position.y;

    if (span > containerWidth * 0.95) {
      needsReflow = true;
      break;
    }
  }

  if (!needsReflow) return null;

  const result = nodes.map((n) => ({ ...n, position: { ...n.position } }));
  const nodeMap = new Map(result.map((n) => [n.id, n]));
  const reflowedNodeIds = new Set<string>();
  let yOffset = 0;
  let prevLayerCenterX: number | null = null;

  for (const [layerY, layerNodes] of sortedLayers) {
    layerNodes.sort((a, b) =>
      isTB ? a.position.x - b.position.x : a.position.y - b.position.y,
    );

    const first = layerNodes[0];
    const last = layerNodes[layerNodes.length - 1];
    let maxW = 0;
    let maxH = 0;
    for (const ln of layerNodes) {
      const w = fallbackW(ln);
      const h = fallbackH(ln);
      if (w > maxW) maxW = w;
      if (h > maxH) maxH = h;
    }
    const span = isTB
      ? (last.position.x + fallbackW(last)) - first.position.x
      : (last.position.y + fallbackH(last)) - first.position.y;

    if (layerNodes.length > 3 && span > containerWidth * 0.95) {
      const cellW = maxW + REFLOW_COL_GAP;
      const cellH = maxH + REFLOW_ROW_GAP;
      const cols = Math.max(1, Math.floor((containerWidth * 0.9) / cellW));
      const gridWidth = cols * maxW + (cols - 1) * REFLOW_COL_GAP;

      const anchorX: number = prevLayerCenterX ?? (first.position.x + span / 2);
      const startX: number = anchorX - gridWidth / 2;

      for (let i = 0; i < layerNodes.length; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const node = nodeMap.get(layerNodes[i].id)!;
        const nw = fallbackW(layerNodes[i]);
        node.position = {
          x: startX + col * cellW + (maxW - nw) / 2,
          y: layerY + yOffset + row * cellH,
        };
        reflowedNodeIds.add(node.id);
      }

      const rows = Math.ceil(layerNodes.length / cols);
      yOffset += (rows - 1) * cellH;
      prevLayerCenterX = startX + gridWidth / 2;
    } else {
      for (const layerNode of layerNodes) {
        const node = nodeMap.get(layerNode.id)!;
        if (isTB) node.position.y += yOffset;
        else node.position.x += yOffset;
      }

      const updatedFirst = nodeMap.get(layerNodes[0].id)!;
      const updatedLast = nodeMap.get(layerNodes[layerNodes.length - 1].id)!;
      const layerLeft = updatedFirst.position.x;
      const layerRight = updatedLast.position.x + fallbackW(updatedLast);
      prevLayerCenterX = (layerLeft + layerRight) / 2;
    }
  }

  return { nodes: result, invalidEdgeIds: reflowedNodeIds };
}

// -- Public API ---------------------------------------------------------------

/** Fixed dimensions for CompactTypeNode */
const COMPACT_NODE_W = 120;
const COMPACT_NODE_H = 40;

/** Larger fallback for ExploreNode (labels are wider) */
const EXPLORE_NODE_W = 190;
const EXPLORE_NODE_H = 64;

/**
 * Layout for compact type nodes — no ports, fixed dimensions.
 * Uses the same ELK layered algorithm and LRU cache.
 */
export async function getLayoutedElementsV2(
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB',
  containerSize?: { width: number; height: number },
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  const cacheKey = buildCacheKey(nodes, edges, `v2-${direction}-${containerSize?.width ?? 0}x${containerSize?.height ?? 0}`);
  const cached = getCached(cacheKey);
  if (cached) return { nodes: cached.nodes, edges: cached.edges };

  const nodeIds = new Set(nodes.map((n) => n.id));
  const validEdges = edges.filter(
    (e) => nodeIds.has(e.source) && nodeIds.has(e.target),
  );

  const isTB = direction === 'TB';

  const elkChildren: ElkNode[] = nodes.map((node) => {
    const isExplore = node.type === 'explore';
    return {
      id: node.id,
      width: node.measured?.width ?? (isExplore ? EXPLORE_NODE_W : COMPACT_NODE_W),
      height: node.measured?.height ?? (isExplore ? EXPLORE_NODE_H : COMPACT_NODE_H),
    };
  });

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

  let positionedNodes = nodes.map((node) => {
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

  // Post-process: reflow wide layers into a grid
  const reflowedNodeIds = new Set<string>();
  if (containerSize) {
    const targetWidth = isTB ? containerSize.width : containerSize.height;
    const reflow = reflowWideLayers(positionedNodes, targetWidth, isTB);
    if (reflow) {
      positionedNodes = reflow.nodes;
      for (const id of reflow.invalidEdgeIds) reflowedNodeIds.add(id);
    }
  }

  const enrichedEdges = edges.map((edge) => {
    // Drop elkRoute for edges touching reflowed nodes — they'll use smooth step fallback
    if (reflowedNodeIds.has(edge.source) || reflowedNodeIds.has(edge.target)) {
      return { ...edge, data: { ...edge.data } };
    }
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
