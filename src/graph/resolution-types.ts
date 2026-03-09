import type { RewriteRule } from "../types";

/** A single branch in a permission resolution tree */
export interface ResolutionBranch {
  /** Current node in the chain */
  nodeId: string;
  /** FGA type name */
  type: string;
  /** FGA relation name */
  relation: string;
  /** How we got here (edge rewrite rule) */
  edgeType: RewriteRule;
  /** Further upstream branches */
  children: ResolutionBranch[];
  /** True if this is a terminal role (accepts [user] tuples, no upstream computed/TTU/tupleset-dep edges) */
  isTerminal: boolean;
}

/** Result of resolving a permission's dependency tree */
export interface ResolutionResult {
  /** The permission node ID that was resolved */
  permissionId: string;
  /** Upstream dependency tree */
  tree: ResolutionBranch[];
  /** Flat summary: terminal roles grouped by type */
  summary: Map<string, string[]>;
}

/** Result of auditing a role's downstream permissions */
export interface RoleAuditResult {
  /** The role node ID that was audited */
  roleId: string;
  /** Permissions grouped by type — type name -> permission relation names */
  permissions: Map<string, string[]>;
}

/** Result of checking if a permission is reachable from a role */
export interface CheckResult {
  /** Whether the permission is reachable from the role */
  reachable: boolean;
  /** If reachable: shortest path from role to permission (node IDs in order) */
  path: string[] | null;
  /** If not reachable: permission relation names on the same type that ARE reachable */
  reachableOnSameType: string[];
}
