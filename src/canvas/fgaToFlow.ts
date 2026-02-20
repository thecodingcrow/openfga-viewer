import { MarkerType, type Node, type Edge } from '@xyflow/react';
import type { AuthorizationNode, AuthorizationEdge } from '../types';
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

// Marker definitions per visual edge type
const MARKERS: Record<'direct' | 'computed', Edge['markerEnd']> = {
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
};

export function toFlowEdge(edge: AuthorizationEdge): Edge {
  const rule = edge.rewriteRule as 'direct' | 'computed';
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: rule,
    animated: false,
    markerEnd: MARKERS[rule],
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

  // Filter out TTU edges — they only exist as hover metadata, never render
  const visualEdges = edges.filter((e) => e.rewriteRule !== 'ttu');
  const flowEdges = visualEdges.map(toFlowEdge);

  return {
    nodes: flowNodes,
    edges: flowEdges,
  };
}
