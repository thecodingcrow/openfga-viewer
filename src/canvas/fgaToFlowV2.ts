import type { Node, Edge } from "@xyflow/react";
import type { AuthorizationEdge, Dimension } from "../types";
import type { CompactTypeData } from "./nodes/CompactTypeNode";
import { TYPE_RESTRICTION_COLOR } from "../theme/dimensions";

/** Edge data for type-level edges */
interface TypeLevelEdgeData {
  /** Aggregated relation labels */
  label: string;
  /** Stroke color — dimension color if uniform, else neutral */
  color: string;
  [key: string]: unknown;
}

/**
 * Convert visible type names and authorization edges into React Flow elements
 * for the compact graph.
 *
 * - One React Flow node per type name (CompactTypeNode)
 * - Edges deduplicated to type-level: multiple relation edges between the same
 *   two types collapse into one edge with aggregated label
 */
export function toFlowElementsV2(
  visibleTypeNames: string[],
  edges: AuthorizationEdge[],
  anchorType: string | null,
  dimensions: Map<string, Dimension>,
): { nodes: Node[]; edges: Edge[] } {
  // 1. Build compact nodes
  const typeSet = new Set(visibleTypeNames);
  const flowNodes: Node[] = visibleTypeNames.map((typeName) => {
    const nodeData: CompactTypeData = {
      label: typeName,
      isAnchorType: typeName === anchorType,
    };
    return {
      id: typeName,
      type: "compactType",
      position: { x: 0, y: 0 },
      data: nodeData,
    };
  });

  // 2. Deduplicate edges to type-level
  //    Key: "sourceType->targetType", value: { labels, dimensionColors }
  const edgeGroups = new Map<
    string,
    { sourceType: string; targetType: string; labels: string[]; dimensionColors: Set<string> }
  >();

  for (const edge of edges) {
    const sourceType = edge.source.split("#")[0];
    const targetType = edge.target.split("#")[0];

    // Skip edges where either endpoint type is not in the visible set
    if (!typeSet.has(sourceType) || !typeSet.has(targetType)) continue;

    const key = `${sourceType}->${targetType}`;
    let group = edgeGroups.get(key);
    if (!group) {
      group = { sourceType, targetType, labels: [], dimensionColors: new Set() };
      edgeGroups.set(key, group);
    }

    // Collect label from the edge (relation name or tupleset relation)
    const label = edge.tuplesetRelation ?? edge.label;
    if (label && !group.labels.includes(label)) {
      group.labels.push(label);
    }

    // Collect dimension color if this is a TTU edge
    if (edge.rewriteRule === "ttu" && edge.tuplesetRelation) {
      const dim = dimensions.get(edge.tuplesetRelation);
      if (dim) {
        group.dimensionColors.add(dim.color);
      }
    }
  }

  // 3. Build React Flow edges from groups
  const flowEdges: Edge[] = [];
  for (const [key, group] of edgeGroups) {
    const label = group.labels.join(", ");

    // Use dimension color if all edges in the group share exactly one dimension
    const color =
      group.dimensionColors.size === 1
        ? [...group.dimensionColors][0]
        : TYPE_RESTRICTION_COLOR;

    const edgeData: TypeLevelEdgeData = { label, color };

    flowEdges.push({
      id: `v2-${key}`,
      source: group.sourceType,
      target: group.targetType,
      type: "dimension",
      label,
      data: edgeData,
      style: { stroke: color },
    });
  }

  return { nodes: flowNodes, edges: flowEdges };
}
