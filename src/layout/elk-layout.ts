import ELK from 'elkjs/lib/elk.bundled.js';
import type { Node, Edge } from '@xyflow/react';
import type { ElkNode, ElkExtendedEdge, ElkEdgeSection } from 'elkjs';
import type { Point } from './elk-path';
import type { SchemaCard, CardRow } from '../types';

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

// -- Public API ---------------------------------------------------------------

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

  // -- Build ELK graph (flat, no hierarchy) -----------------------------------

  const isTB = direction === 'TB';

  // Constants matching TypeCardNode CSS (Tailwind v4 defaults)
  // Header: py-1.5 (12px) + text-sm leading (20px) + 1px border-bottom = 33px
  // Row: py-0.5 (4px) + text-xs leading (16px) = 20px
  const HEADER_H = 33;
  const ROW_H = 20;
  const SECTION_ORDER: Record<string, number> = { binding: 0, relation: 1, permission: 2 };

  const elkChildren: ElkNode[] = nodes.map((node) => {
    const w = node.measured?.width ?? 280;
    const h = node.measured?.height ?? 100;
    const card = node.data as SchemaCard & { [key: string]: unknown };
    const rows: CardRow[] = (card.rows as CardRow[]) ?? [];

    // Sort rows to match render order (binding → relation → permission)
    const sortedRows = [...rows].sort((a, b) =>
      (SECTION_ORDER[a.section] ?? 0) - (SECTION_ORDER[b.section] ?? 0),
    );

    // Compute estimated Y center for each row
    let yOffset = HEADER_H;
    let prevSection = '';
    const rowCenterY = new Map<string, number>();
    for (const row of sortedRows) {
      if (prevSection && row.section !== prevSection) {
        yOffset += 1; // 1px section border
      }
      rowCenterY.set(row.id, yOffset + ROW_H / 2);
      yOffset += ROW_H;
      prevSection = row.section;
    }

    // Scale estimated positions to match actual measured height
    const scale = h / Math.max(yOffset, 1);
    const headerCenterY = ((HEADER_H - 1) / 2) * scale;

    // Build ports with explicit positions
    const ports: { id: string; x?: number; y?: number; properties: Record<string, string> }[] = [];
    let targetIndex = 0;
    let sourceIndex = 0;

    // Header ports
    ports.push({
      id: `${node.id}__header_target`,
      x: isTB ? 0 : headerCenterY,
      y: isTB ? headerCenterY : 0,
      properties: {
        'port.side': isTB ? 'WEST' : 'NORTH',
        'port.index': String(targetIndex++),
      },
    });
    ports.push({
      id: `${node.id}__header_source`,
      x: isTB ? w : headerCenterY,
      y: isTB ? headerCenterY : h,
      properties: {
        'port.side': isTB ? 'EAST' : 'SOUTH',
        'port.index': String(sourceIndex++),
      },
    });

    // Row ports (in render order)
    for (const row of sortedRows) {
      const cy = (rowCenterY.get(row.id) ?? 0) * scale;
      ports.push({
        id: `${row.id}__target`,
        x: isTB ? 0 : cy,
        y: isTB ? cy : 0,
        properties: {
          'port.side': isTB ? 'WEST' : 'NORTH',
          'port.index': String(targetIndex++),
        },
      });
      ports.push({
        id: `${row.id}__source`,
        x: isTB ? w : cy,
        y: isTB ? cy : h,
        properties: {
          'port.side': isTB ? 'EAST' : 'SOUTH',
          'port.index': String(sourceIndex++),
        },
      });
    }

    return {
      id: node.id,
      width: w,
      height: h,
      properties: {
        'org.eclipse.elk.portConstraints': 'FIXED_POS',
      },
      ports,
    };
  });

  const elkEdges = validEdges.map((edge) => ({
    id: edge.id,
    sources: [edge.sourceHandle ?? edge.source],
    targets: [edge.targetHandle ?? edge.target],
  }));

  const elkGraph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': isTB ? 'DOWN' : 'RIGHT',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.spacing.nodeNode': '50',
      'elk.layered.spacing.nodeNodeBetweenLayers': '70',
      'elk.spacing.portPort': '4',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.nodePlacement.favorStraightEdges': 'true',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
    },
    children: elkChildren,
    edges: elkEdges,
  };

  const laidOut = await elk.layout(elkGraph);

  // -- Map ELK positions back to React Flow nodes -----------------------------

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

  // -- Extract edge routes from ELK sections ----------------------------------

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

  // -- Assemble output edges with elkRoute data -------------------------------

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
