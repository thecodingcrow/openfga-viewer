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
export type FocusMode = "overview" | "neighborhood" | "path";

/** Graph filter state */
export interface GraphFilters {
  /** Show only these types (empty array = show all) */
  types: string[];
  /** When true, only show permission relations (can_*) and type nodes */
  permissionsOnly: boolean;
}

/** Dagre layout direction (top-to-bottom or left-to-right) */
export type LayoutDirection = "TB" | "LR";
