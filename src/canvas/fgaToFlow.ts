import type { Node, Edge } from '@xyflow/react';
import type { AuthorizationNode, AuthorizationEdge } from '../types';

export interface FgaNodeData {
  typeName: string;
  relation: string;
  isPermission: boolean;
  definition?: string;
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

export function toFlowEdge(edge: AuthorizationEdge): Edge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: edge.rewriteRule,
    animated: edge.rewriteRule === 'computed',
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
  return {
    nodes: nodes.map(toFlowNode),
    edges: edges.map(toFlowEdge),
  };
}
