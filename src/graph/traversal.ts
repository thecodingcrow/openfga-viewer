import type { AuthorizationNode } from "../types";

// ─── Unique types extractor ─────────────────────────────────────────────────

/** Extract sorted unique type names from the node set */
export function extractTypeNames(nodes: AuthorizationNode[]): string[] {
  return [...new Set(nodes.map((n) => n.type))].sort();
}
