import type { ResolutionResult, RoleAuditResult, CheckResult } from "./graph/resolution-types";

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

/** Dagre layout direction (top-to-bottom or left-to-right) */
export type LayoutDirection = "TB" | "LR";

// ─── Dimension types ────────────────────────────────────────────────────────

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

// ─── Anchor types ───────────────────────────────────────────────────────────

export type AnchorKind = 'permission' | 'role' | 'checker';

export interface PermissionAnchor {
  kind: 'permission';
  nodeId: string;
  result: ResolutionResult;
}

export interface RoleAnchor {
  kind: 'role';
  nodeId: string;
  result: RoleAuditResult;
}

export interface CheckerAnchor {
  kind: 'checker';
  subjectNodeId: string;
  targetNodeId: string;
  result: CheckResult;
}

export type Anchor = PermissionAnchor | RoleAnchor | CheckerAnchor;
