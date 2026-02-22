/**
 * Dimension detection, edge classification, and expression transformation.
 *
 * Operates on the parser's AuthorizationGraph output to produce typed data
 * structures for the new ERD-card visualization pipeline.
 */

import type {
  AuthorizationGraph,
  AuthorizationEdge,
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

// ─── Edge Classification ────────────────────────────────────────────────────

/**
 * Classify edges into cross-card (rendered as visual edges) and same-card
 * (rendered as expression text within cards).
 *
 * Cross-card: `direct` (type-restriction) and `ttu` (dimension) edges.
 * Same-card: `computed` and `tupleset-dep` edges.
 */
export function classifyEdges(edges: AuthorizationEdge[]): {
  crossCard: AuthorizationEdge[];
  sameCard: AuthorizationEdge[];
} {
  const crossCard: AuthorizationEdge[] = [];
  const sameCard: AuthorizationEdge[] = [];

  for (const edge of edges) {
    if (edge.rewriteRule === "direct" || edge.rewriteRule === "ttu") {
      crossCard.push(edge);
    } else {
      sameCard.push(edge);
    }
  }

  return { crossCard, sameCard };
}

// ─── Expression Transformation ──────────────────────────────────────────────

/**
 * Transform a parser definition string for compact display in card rows.
 *
 * Conversions:
 * - `X from Y` becomes `↗Y.X` (dimension reference with up-right arrow)
 * - `or` becomes `|`, `and` becomes `&`, `but not` becomes `\`
 * - `[type]` and `[type#relation]` stay as-is (direct type restrictions)
 * - Plain names stay as-is (computed references)
 */
export function transformExpression(definition: string): string {
  // Handle "but not" first — it contains "not" which could interfere
  // Split on " but not " to get base and subtract parts
  const butNotParts = definition.split(" but not ");
  const transformed = butNotParts.map((butNotPart) => {
    // Within each but-not segment, split on " and "
    const andParts = butNotPart.split(" and ");
    const andTransformed = andParts.map((andPart) => {
      // Within each and-segment, split on " or "
      const orParts = andPart.split(" or ");
      return orParts.map(transformTerm).join(" | ");
    });
    return andTransformed.join(" & ");
  });
  return transformed.join(" \\ ");
}

/** Transform a single term (no operators) */
function transformTerm(term: string): string {
  const trimmed = term.trim();

  // "X from Y" pattern → ↗Y.X
  const fromMatch = trimmed.match(/^(.+)\s+from\s+(.+)$/);
  if (fromMatch) {
    return `↗${fromMatch[2].trim()}.${fromMatch[1].trim()}`;
  }

  // [type], [type#relation], [type:*] — keep as-is
  // Plain names (computed references) — keep as-is
  return trimmed;
}
