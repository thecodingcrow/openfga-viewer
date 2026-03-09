/**
 * Dimension detection from TTU tupleset patterns.
 *
 * Operates on the parser's AuthorizationGraph output to produce dimension
 * data structures for edge coloring in the graph visualization.
 */

import type {
  AuthorizationGraph,
  Dimension,
} from "../types";

// ─── Dimension Detection ────────────────────────────────────────────────────

/**
 * Detect structural dimensions from TTU tupleset patterns in the graph.
 *
 * Groups TTU edges by their `tuplesetRelation` field — each unique tupleset
 * relation name becomes a dimension. Binding nodes (`isTuplesetBinding`)
 * are associated with their matching dimension.
 *
 * Colors are left empty ("") — call `assignDimensionColors()` to populate them.
 */
export function detectDimensions(
  graph: AuthorizationGraph,
): Map<string, Dimension> {
  const dimensions = new Map<string, Dimension>();

  // Group TTU edges by tuplesetRelation
  for (const edge of graph.edges) {
    if (edge.rewriteRule !== "ttu") continue;
    const dimName = edge.tuplesetRelation;
    if (!dimName) continue;

    if (!dimensions.has(dimName)) {
      dimensions.set(dimName, {
        name: dimName,
        color: "",
        bindingNodeIds: new Set(),
        edgeIds: new Set(),
      });
    }
    dimensions.get(dimName)!.edgeIds.add(edge.id);
  }

  // Collect binding nodes per dimension
  for (const node of graph.nodes) {
    if (node.isTuplesetBinding && node.relation) {
      const dimName = node.relation;
      if (dimensions.has(dimName)) {
        dimensions.get(dimName)!.bindingNodeIds.add(node.id);
      }
    }
  }

  return dimensions;
}
