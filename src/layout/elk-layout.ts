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

// ─── Grid redistribution for wide compounds ─────────────────────────────────

const MAX_COMPOUND_SIZE = 1100;
const COL_GAP = 24;
const ROW_GAP = 28;
const GRID_PADDING = { top: 40, left: 12, bottom: 12, right: 12 };

/**
 * After ELK layout, detect compounds that exceed MAX_COMPOUND_SIZE along the
 * main axis and redistribute their children into a compact grid. Children are
 * split into two bands (relations then permissions) with one break between
 * them. Within each band, children flow continuously sorted by ELK layer
 * position. Mutates the ELK result in-place.
 */
function redistributeCompoundChildren(
  laidOut: ElkNode,
  direction: 'TB' | 'LR',
  permissionIds: Set<string>,
): Set<string> {
  const redistributed = new Set<string>();
  const isTB = direction === 'TB';

  for (const compound of laidOut.children ?? []) {
    if (!compound.children || compound.children.length === 0) continue;

    const span = isTB ? (compound.width ?? 0) : (compound.height ?? 0);
    if (span <= MAX_COMPOUND_SIZE) continue;

    // Split into relation band (roles) and permission band, preserving
    // ELK layer order within each band for dependency-direction flow.
    const sortByLayer = (a: ElkNode, b: ElkNode) => {
      const aMain = isTB ? (a.y ?? 0) : (a.x ?? 0);
      const bMain = isTB ? (b.y ?? 0) : (b.x ?? 0);
      if (aMain !== bMain) return aMain - bMain;
      return isTB ? (a.x ?? 0) - (b.x ?? 0) : (a.y ?? 0) - (b.y ?? 0);
    };

    const relationBand: ElkNode[] = [];
    const permissionBand: ElkNode[] = [];
    for (const child of compound.children) {
      if (permissionIds.has(child.id)) {
        permissionBand.push(child);
      } else {
        relationBand.push(child);
      }
    }
    relationBand.sort(sortByLayer);
    permissionBand.sort(sortByLayer);

    const bands = [relationBand, permissionBand].filter((b) => b.length > 0);

    // Max child dimensions for uniform grid cells
    let maxW = 0;
    let maxH = 0;
    for (const child of compound.children) {
      maxW = Math.max(maxW, child.width ?? 120);
      maxH = Math.max(maxH, child.height ?? 40);
    }

    if (isTB) {
      const avail = MAX_COMPOUND_SIZE - GRID_PADDING.left - GRID_PADDING.right;
      const cols = Math.max(1, Math.floor((avail + COL_GAP) / (maxW + COL_GAP)));

      let row = 0;
      let maxColsUsed = 0;

      for (const band of bands) {
        let col = 0;
        for (const child of band) {
          child.x = GRID_PADDING.left + col * (maxW + COL_GAP);
          child.y = GRID_PADDING.top + row * (maxH + ROW_GAP);
          col++;
          if (col >= cols) { col = 0; row++; }
        }
        maxColsUsed = Math.max(maxColsUsed, Math.min(band.length, cols));
        if (col > 0) row++; // band break: start new row for next band
      }

      compound.width =
        GRID_PADDING.left + maxColsUsed * (maxW + COL_GAP) - COL_GAP + GRID_PADDING.right;
      compound.height =
        GRID_PADDING.top + row * (maxH + ROW_GAP) - ROW_GAP + GRID_PADDING.bottom;
    } else {
      const avail = MAX_COMPOUND_SIZE - GRID_PADDING.top - GRID_PADDING.bottom;
      const rows = Math.max(1, Math.floor((avail + ROW_GAP) / (maxH + ROW_GAP)));

      let colIdx = 0;
      let maxRowsUsed = 0;

      for (const band of bands) {
        let rowIdx = 0;
        for (const child of band) {
          child.x = GRID_PADDING.left + colIdx * (maxW + COL_GAP);
          child.y = GRID_PADDING.top + rowIdx * (maxH + ROW_GAP);
          rowIdx++;
          if (rowIdx >= rows) { rowIdx = 0; colIdx++; }
        }
        maxRowsUsed = Math.max(maxRowsUsed, Math.min(band.length, rows));
        if (rowIdx > 0) colIdx++; // band break: start new column for next band
      }

      compound.width =
        GRID_PADDING.left + colIdx * (maxW + COL_GAP) - COL_GAP + GRID_PADDING.right;
      compound.height =
        GRID_PADDING.top + maxRowsUsed * (maxH + ROW_GAP) - ROW_GAP + GRID_PADDING.bottom;
    }

    for (const child of compound.children) redistributed.add(child.id);
  }

  return redistributed;
}

/**
 * After redistribution changes compound sizes, run a second ELK pass on a flat
 * root graph (no INCLUDE_CHILDREN) to reposition compounds with correct
 * dimensions. Mutates laidOut compound positions in-place.
 */
async function repackRootLevel(
  laidOut: ElkNode,
  validEdges: Edge[],
  direction: 'TB' | 'LR',
): Promise<void> {
  const children = laidOut.children ?? [];
  if (children.length === 0) return;

  // Flat root nodes with post-redistribution sizes
  const rootChildren: ElkNode[] = children.map((c) => ({
    id: c.id,
    width: c.width ?? 120,
    height: c.height ?? 40,
  }));

  // Map child IDs to parent compound IDs
  const childToParent = new Map<string, string>();
  for (const c of children) {
    for (const gc of c.children ?? []) {
      childToParent.set(gc.id, c.id);
    }
  }

  // Collapse child-to-child edges into root-level compound-to-compound edges
  const rootNodeIds = new Set(children.map((c) => c.id));
  const seenEdges = new Set<string>();
  const rootEdges: { id: string; sources: string[]; targets: string[] }[] = [];
  for (const edge of validEdges) {
    const src = childToParent.get(edge.source) ?? edge.source;
    const tgt = childToParent.get(edge.target) ?? edge.target;
    if (src === tgt) continue;
    if (!rootNodeIds.has(src) || !rootNodeIds.has(tgt)) continue;
    const key = `${src}->${tgt}`;
    if (seenEdges.has(key)) continue;
    seenEdges.add(key);
    rootEdges.push({ id: key, sources: [src], targets: [tgt] });
  }

  const rootGraph: ElkNode = {
    id: 'root-repack',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': direction === 'TB' ? 'DOWN' : 'RIGHT',
      'elk.edgeRouting': 'POLYLINE',
      'elk.layered.spacing.nodeNodeBetweenLayers': '36',
      'elk.spacing.nodeNode': '32',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.nodePlacement.favorStraightEdges': 'true',
    },
    children: rootChildren,
    edges: rootEdges,
  };

  const rootLaidOut = await elk.layout(rootGraph);

  // Apply new positions back to the original result
  const posMap = new Map<string, { x: number; y: number }>();
  for (const c of rootLaidOut.children ?? []) {
    posMap.set(c.id, { x: c.x ?? 0, y: c.y ?? 0 });
  }
  for (const c of children) {
    const pos = posMap.get(c.id);
    if (pos) {
      c.x = pos.x;
      c.y = pos.y;
    }
  }
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
          'elk.padding': 'top=40,left=4,bottom=12,right=4',
          'elk.layered.spacing.nodeNodeBetweenLayers': '24',
          'elk.layered.spacing.edgeEdgeBetweenLayers': '4',
          'elk.layered.spacing.edgeNodeBetweenLayers': '8',
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
      'elk.edgeRouting': 'POLYLINE',
      'elk.layered.spacing.nodeNodeBetweenLayers': '36',
      'elk.spacing.nodeNode': '32',
      'elk.layered.spacing.edgeEdgeBetweenLayers': '4',
      'elk.layered.spacing.edgeNodeBetweenLayers': '8',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.nodePlacement.favorStraightEdges': 'true',
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

  // ── Redistribute wide compounds into a grid ────────────────────────────
  const permissionIds = new Set<string>();
  for (const node of nodes) {
    if (node.type === 'permission') permissionIds.add(node.id);
  }
  const redistributedNodeIds = redistributeCompoundChildren(
    laidOut, direction, permissionIds,
  );

  // Repack root-level positions with updated compound sizes
  if (redistributedNodeIds.size > 0) {
    await repackRootLevel(laidOut, validEdges, direction);
  }

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

  // When compounds were repacked, all root positions changed — skip ALL ELK
  // routes and let React Flow's getSmoothStepPath compute from live positions.
  const skipAllRoutes = redistributedNodeIds.size > 0;

  const enrichedEdges = edges.map((edge) => {
    const route = edgeRoutes.get(edge.id);
    const srcBounds = nodeBounds.get(edge.source);
    return {
      ...edge,
      data: {
        ...edge.data,
        ...(route && !skipAllRoutes ? { elkRoute: route } : {}),
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
