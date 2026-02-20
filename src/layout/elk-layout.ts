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

  // ── Group relation/permission nodes by parent type ──────────────────────
  const typeNodeIds = new Set<string>();
  for (const node of nodes) {
    if (node.type === 'type') typeNodeIds.add(node.id);
  }

  const typeChildrenMap = new Map<string, Node[]>();
  const orphanNodes: Node[] = [];

  for (const node of nodes) {
    if (node.type === 'type') continue;
    const parentTypeName = (node.data as { typeName: string }).typeName;
    if (typeNodeIds.has(parentTypeName)) {
      const children = typeChildrenMap.get(parentTypeName) ?? [];
      children.push(node);
      typeChildrenMap.set(parentTypeName, children);
    } else {
      orphanNodes.push(node);
    }
  }

  // ── Build hierarchical ELK graph ───────────────────────────────────────
  const elkChildren: ElkNode[] = [];

  for (const node of nodes) {
    if (node.type !== 'type') continue;

    const children = typeChildrenMap.get(node.id);
    if (children && children.length > 0) {
      // Compound type node — ELK computes size from children + padding
      elkChildren.push({
        id: node.id,
        layoutOptions: {
          'elk.padding': 'top=40,left=12,bottom=12,right=12',
        },
        children: children.map((c) => ({
          id: c.id,
          width: c.measured?.width ?? 120,
          height: c.measured?.height ?? 40,
        })),
      });
    } else {
      // Leaf type node — simple node with measured size
      elkChildren.push({
        id: node.id,
        width: node.measured?.width ?? 120,
        height: node.measured?.height ?? 40,
      });
    }
  }

  // Orphan relation/permission nodes (parent type not in visible graph)
  for (const node of orphanNodes) {
    elkChildren.push({
      id: node.id,
      width: node.measured?.width ?? 120,
      height: node.measured?.height ?? 40,
    });
  }

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
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      'json.edgeCoords': 'ROOT',
    },
    children: elkChildren,
    edges: validEdges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  const laidOut = await elk.layout(elkGraph);

  // ── Extract positions from hierarchical result ─────────────────────────
  const nodePositions = new Map<string, { x: number; y: number }>();
  const nodeBounds = new Map<string, NodeBounds>();
  const compoundSizes = new Map<string, { width: number; height: number }>();
  const childParentMap = new Map<string, string>();

  for (const child of laidOut.children ?? []) {
    const x = child.x ?? 0;
    const y = child.y ?? 0;
    const w = child.width ?? 120;
    const h = child.height ?? 40;

    nodePositions.set(child.id, { x, y });
    nodeBounds.set(child.id, { x, y, width: w, height: h });

    // Process compound node children
    if (child.children && child.children.length > 0) {
      compoundSizes.set(child.id, { width: w, height: h });

      for (const grandchild of child.children) {
        const cx = grandchild.x ?? 0;
        const cy = grandchild.y ?? 0;
        const cw = grandchild.width ?? 120;
        const ch = grandchild.height ?? 40;

        // React Flow position: relative to parent
        nodePositions.set(grandchild.id, { x: cx, y: cy });
        // nodeBounds: absolute position for edge trimming
        nodeBounds.set(grandchild.id, {
          x: x + cx, y: y + cy, width: cw, height: ch,
        });
        childParentMap.set(grandchild.id, child.id);
      }
    }
  }

  // ── Build edge routes ──────────────────────────────────────────────────
  // ELK relocates edges to their LCA — intra-compound edges end up inside
  // compound.edges, not root.edges. Collect from all hierarchy levels.
  const allElkEdges: ElkExtendedEdge[] = [];
  for (const e of laidOut.edges ?? []) allElkEdges.push(e as ElkExtendedEdge);
  for (const child of laidOut.children ?? []) {
    for (const e of child.edges ?? []) allElkEdges.push(e as ElkExtendedEdge);
  }

  const edgeRoutes = new Map<string, ElkRoute>();
  for (const extEdge of allElkEdges) {
    const sections = extEdge.sections ?? [];
    const points = extractPointsFromSections(sections);
    if (points.length >= 2) {
      const edge = edges.find((e) => e.id === extEdge.id);
      if (edge && edge.source !== edge.target) {
        const sourceBounds = nodeBounds.get(edge.source);
        const targetBounds = nodeBounds.get(edge.target);
        const trimmed =
          sourceBounds && targetBounds
            ? trimPathToHandles(points, sourceBounds, targetBounds, direction)
            : points;
        edgeRoutes.set(extEdge.id ?? '', { points: trimmed });
      } else {
        edgeRoutes.set(extEdge.id ?? '', { points });
      }
    }
  }

  // ── Assemble output nodes ──────────────────────────────────────────────
  const positionedNodes = nodes.map((node) => {
    const pos = nodePositions.get(node.id) ?? { x: 0, y: 0 };
    const compound = compoundSizes.get(node.id);
    const parentTypeId = childParentMap.get(node.id);

    return {
      ...node,
      position: pos,
      ...(compound
        ? { style: { ...node.style, width: compound.width, height: compound.height } }
        : {}),
      ...(parentTypeId
        ? { parentId: parentTypeId, extent: 'parent' as const }
        : {}),
    };
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
