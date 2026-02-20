import { MarkerType, type Node, type Edge } from '@xyflow/react';
import type { AuthorizationNode, AuthorizationEdge, RewriteRule } from '../types';
import { blueprint } from '../theme/colors';

export interface FgaNodeData {
  typeName: string;
  relation: string;
  isPermission: boolean;
  definition?: string;
  isCompound?: boolean;
  [key: string]: unknown;
}

export function toFlowNode(node: AuthorizationNode): Node<FgaNodeData> {
  const nodeType = node.kind === 'type'
    ? 'type'
    : node.isPermission ? 'permission' : 'relation';

  return {
    id: node.id,
    type: nodeType,
    position: { x: 0, y: 0 },
    data: {
      typeName: node.type,
      relation: node.relation ?? '',
      isPermission: node.isPermission,
      definition: node.definition,
    },
  };
}

// Marker definitions per edge type
const MARKERS: Record<RewriteRule, Edge['markerEnd']> = {
  computed: {
    type: MarkerType.Arrow,
    width: 12,
    height: 12,
    color: blueprint.edgeComputed,
  },
  direct: {
    type: MarkerType.Arrow,
    width: 10,
    height: 10,
    color: blueprint.edgeDirect,
  },
  ttu: {
    type: MarkerType.ArrowClosed,
    width: 12,
    height: 12,
    color: blueprint.edgeTtu,
  },
};

// Sort priority: direct at bottom of SVG z-order, TTU on top
const EDGE_Z_ORDER: Record<RewriteRule, number> = {
  direct: 0,
  computed: 1,
  ttu: 2,
};

export function toFlowEdge(edge: AuthorizationEdge): Edge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: edge.rewriteRule,
    animated: false,
    markerEnd: MARKERS[edge.rewriteRule],
    data: {
      tuplesetLabel: edge.rewriteRule === 'ttu'
        ? `from ${edge.tuplesetRelation}` : undefined,
    },
  };
}

export function toFlowElements(
  nodes: AuthorizationNode[],
  edges: AuthorizationEdge[],
): { nodes: Node<FgaNodeData>[]; edges: Edge[] } {
  // Determine which types are compound (have relation/permission children)
  const compoundTypes = new Set<string>();
  for (const node of nodes) {
    if (node.kind !== 'type') {
      compoundTypes.add(node.type);
    }
  }

  const flowNodes = nodes.map((node) => {
    const n = toFlowNode(node);
    if (node.kind === 'type' && compoundTypes.has(node.type)) {
      n.data.isCompound = true;
    }
    return n;
  });

  // React Flow v12 requires parent nodes before children in the array
  flowNodes.sort((a, b) => {
    const aIsType = a.type === 'type' ? 0 : 1;
    const bIsType = b.type === 'type' ? 0 : 1;
    return aIsType - bIsType;
  });

  // Sort edges by type priority so direct renders at bottom of SVG z-order
  const flowEdges = edges.map(toFlowEdge);
  flowEdges.sort((a, b) =>
    EDGE_Z_ORDER[(a.type as RewriteRule) ?? 'direct'] -
    EDGE_Z_ORDER[(b.type as RewriteRule) ?? 'direct'],
  );

  return {
    nodes: flowNodes,
    edges: flowEdges,
  };
}
