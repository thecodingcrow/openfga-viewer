/**
 * Converts an AuthorizationGraph into React Flow elements using the ERD-card pipeline.
 *
 * Groups AuthorizationNodes by type into SchemaCard nodes. Filters edges to
 * cross-card only (direct + ttu). Returns dimension data alongside flow elements.
 */

import type { Node, Edge } from "@xyflow/react";
import type {
  AuthorizationGraph,
  Dimension,
  SchemaCard,
  CardRow,
  EdgeClassification,
} from "../types";
import { detectDimensions, classifyEdges, transformExpression } from "../dimensions/detect";
import { assignDimensionColors } from "../theme/dimensions";
import { getTypeColor } from "../theme/colors";

/** React Flow node data with index signature for compatibility */
type SchemaCardData = SchemaCard & { [key: string]: unknown };

/** Edge data for DimensionEdge */
interface DimensionEdgeData {
  classification: EdgeClassification;
  dimensionColor?: string;
  [key: string]: unknown;
}

/**
 * Convert an AuthorizationGraph into React Flow nodes (TypeCardNode) and
 * edges (DimensionEdge), plus the detected dimension map.
 *
 * - One React Flow node per FGA type (not per relation)
 * - Only cross-card edges (direct + ttu) become visual edges
 * - Same-card edges (computed, tupleset-dep) appear as expression text within cards
 */
export function toFlowElements(graph: AuthorizationGraph): {
  nodes: Node[];
  edges: Edge[];
  dimensions: Map<string, Dimension>;
} {
  // 1. Detect and color dimensions
  const rawDimensions = detectDimensions(graph);
  const dimensions = assignDimensionColors(rawDimensions);

  // 2. Classify edges into cross-card (visual) and same-card (text)
  const { crossCard } = classifyEdges(graph.edges);

  // 3. Group nodes by type
  const nodesByType = new Map<string, typeof graph.nodes>();
  for (const node of graph.nodes) {
    const typeNodes = nodesByType.get(node.type);
    if (typeNodes) {
      typeNodes.push(node);
    } else {
      nodesByType.set(node.type, [node]);
    }
  }

  // 4. Build React Flow nodes — one per type
  const flowNodes: Node[] = [];
  for (const [typeName, typeNodes] of nodesByType) {
    const rows: CardRow[] = [];

    // Separate type node from child nodes
    const children = typeNodes.filter((n) => n.kind !== "type");

    // Classify children into sections
    const bindings: typeof children = [];
    const relations: typeof children = [];
    const permissions: typeof children = [];

    for (const child of children) {
      if (child.isTuplesetBinding) {
        bindings.push(child);
      } else if (child.isPermission) {
        permissions.push(child);
      } else {
        relations.push(child);
      }
    }

    // Sort each section alphabetically by relation name for stable order
    const byName = (a: (typeof children)[0], b: (typeof children)[0]) =>
      (a.relation ?? "").localeCompare(b.relation ?? "");
    bindings.sort(byName);
    relations.sort(byName);
    permissions.sort(byName);

    // Build rows: bindings first, then relations, then permissions
    for (const node of bindings) {
      // Look up dimension color from the node's relation (dimension name)
      const dim = node.relation ? dimensions.get(node.relation) : undefined;
      rows.push({
        id: node.id,
        name: node.relation ?? node.id,
        section: "binding",
        dimensionColor: dim?.color,
      });
    }

    for (const node of relations) {
      rows.push({
        id: node.id,
        name: node.relation ?? node.id,
        section: "relation",
      });
    }

    for (const node of permissions) {
      rows.push({
        id: node.id,
        name: node.relation ?? node.id,
        section: "permission",
        expression: node.definition
          ? transformExpression(node.definition)
          : undefined,
      });
    }

    const accentColor = getTypeColor(typeName);

    const schemaCard: SchemaCardData = {
      typeName,
      accentColor,
      rows,
    };

    flowNodes.push({
      id: typeName,
      type: "typeCard",
      position: { x: 0, y: 0 },
      data: schemaCard,
    });
  }

  // 5. Build React Flow edges — cross-card only
  //
  // React Flow edges must reference node IDs (card type names) as source/target.
  // The sourceHandle/targetHandle reference the row-level Handle IDs within cards.
  // AuthorizationNode IDs are "{type}#{relation}" or "{type}" — extract the type
  // portion for the card node reference.
  const flowEdges: Edge[] = [];
  for (const edge of crossCard) {
    // Determine classification and color
    let classification: EdgeClassification;
    let dimensionColor: string | undefined;

    if (edge.rewriteRule === "ttu" && edge.tuplesetRelation) {
      classification = "dimension";
      const dim = dimensions.get(edge.tuplesetRelation);
      dimensionColor = dim?.color;
    } else {
      classification = "type-restriction";
    }

    const edgeData: DimensionEdgeData = {
      classification,
      dimensionColor,
    };

    // Extract type name from node ID: "document#viewer" -> "document", "user" -> "user"
    const sourceCard = edge.source.split("#")[0];
    const targetCard = edge.target.split("#")[0];

    flowEdges.push({
      id: edge.id,
      source: sourceCard,
      target: targetCard,
      type: "dimension",
      sourceHandle: `${edge.source}__source`,
      targetHandle: `${edge.target}__target`,
      data: edgeData,
    });
  }

  return { nodes: flowNodes, edges: flowEdges, dimensions };
}
