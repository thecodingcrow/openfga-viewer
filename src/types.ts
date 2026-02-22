/**
 * Authorization model graph types — aligned with the OpenFGA specification.
 *
 * Every node is a (type, relation) pair matching how FGA evaluates checks:
 * "does subject have relation on object?"
 */

/** Discriminates object-type grouping nodes from relation nodes */
export type NodeKind = "type" | "relation";

/**
 * Classifies the userset rewrite rule that created an edge:
 * - direct:   `[type]` or `[type#relation]` — direct type restriction
 * - computed: reference to another relation on the same type (computedUserset)
 * - ttu:      `relation from tupleset` (tupleToUserset)
 */
export type RewriteRule = "direct" | "computed" | "ttu" | "tupleset-dep";

/**
 * A node in the authorization graph.
 * Represents either an FGA object type or a (type, relation) pair.
 */
export interface AuthorizationNode {
  /** Unique key — `{type}#{relation}` for relations, `{type}` for type-only */
  id: string;
  /** FGA object type name */
  type: string;
  /** FGA relation name (undefined for type-only nodes) */
  relation?: string;
  /** Whether this is a type grouping node or a relation definition */
  kind: NodeKind;
  /** Permission relations start with `can_` — drives visual distinction */
  isPermission: boolean;
  /** Human-readable userset rewrite expression (tooltip) */
  definition?: string;
  /** Node IDs this relation's type expression resolves to */
  targets: string[];
  /** True if this relation is used as a tupleset target (structural binding) */
  isTuplesetBinding?: boolean;
  /** For tupleset bindings: the type this relation references (drives color) */
  referencedType?: string;
}

/**
 * An edge in the authorization graph.
 * Represents a dependency between relations via a userset rewrite rule.
 * Direction: source (dependency) ➜ target (dependent relation).
 */
export interface AuthorizationEdge {
  id: string;
  /** The dependency node */
  source: string;
  /** The relation being defined (depends on source) */
  target: string;
  /** Userset rewrite rule that created this edge */
  rewriteRule: RewriteRule;
  /** Display label */
  label?: string;
  /** For TTU edges: the tupleset relation used for traversal */
  tuplesetRelation?: string;
}

/** Result of parsing an FGA authorization model into a graph */
export interface AuthorizationGraph {
  nodes: AuthorizationNode[];
  edges: AuthorizationEdge[];
}

/** Exploration focus mode */
export type FocusMode = "overview" | "neighborhood";

/** Graph filter state */
export interface GraphFilters {
  /** Show only these types (empty array = show all) */
  types: string[];
}

/** Dagre layout direction (top-to-bottom or left-to-right) */
export type LayoutDirection = "TB" | "LR";

// ─── Navigation types ────────────────────────────────────────────────────────

/** A single frame in the subgraph navigation stack */
export interface NavigationFrame {
  /** The node ID that was clicked to enter this subgraph */
  entryNodeId: string;
  /** Direction of traversal */
  direction: "upstream" | "downstream";
  /** Display label for breadcrumb (e.g., "document#can_view" or "user") */
  label: string;
  /** Type names of cards visible in this subgraph */
  visibleTypeIds: Set<string>;
  /** Row IDs (AuthorizationNode IDs) that are "relevant" (non-dimmed) */
  relevantRowIds: Set<string>;
}

/** A dimension that references itself (e.g., parent category hierarchy) */
export interface SelfReferencingDimension {
  /** Dimension name */
  dimensionName: string;
  /** The type that self-references */
  typeName: string;
  /** Tooltip text explaining the self-reference */
  tooltip: string;
}

// ─── Dimension & Schema Card types ──────────────────────────────────────────

/** A structural dimension detected from TTU tupleset patterns */
export interface Dimension {
  /** Dimension name — the tupleset relation name (e.g., "client", "parent") */
  name: string;
  /** Assigned color from the dimension palette */
  color: string;
  /** AuthorizationNode IDs of bindings that create this dimension */
  bindingNodeIds: Set<string>;
  /** AuthorizationEdge IDs of TTU edges belonging to this dimension */
  edgeIds: Set<string>;
}

/** Classification of a visual edge */
export type EdgeClassification = "type-restriction" | "dimension";

/** A row in an ERD schema card */
export interface CardRow {
  /** Node ID — e.g., "client#admin" — matches AuthorizationNode.id */
  id: string;
  /** Display name — e.g., "admin" */
  name: string;
  /** Which section this row belongs to */
  section: "binding" | "relation" | "permission";
  /** Transformed expression for display (permissions only) */
  expression?: string;
  /** Dimension color for binding dots (bindings only) */
  dimensionColor?: string;
  /** Dimension color if this row has an incoming TTU edge (inherited permission) */
  ttuDimensionColor?: string;
}

/** Data for a single ERD schema card (one per FGA type) */
export interface SchemaCard {
  /** FGA type name — e.g., "client" */
  typeName: string;
  /** All rows in display order: bindings, then relations, then permissions */
  rows: CardRow[];
}
