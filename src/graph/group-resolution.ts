import type { ResolutionBranch } from "./resolution-types";

/** A single group in the grouped resolution tree */
export interface ResolutionGroup {
  /** Group classification */
  kind: "ttu" | "computed" | "direct";
  /** Display label: "Via client", "manager (local)", "directly assigned [user]" */
  label: string;
  /** For TTU groups: the tupleset relation name (e.g., "client") */
  tuplesetRelation?: string;
  /** For TTU groups: the absorbed tupleset-dep node ID for hover path construction */
  tuplesetNodeId?: string;
  /** First-hop role labels for the answer line */
  answerRoles: string[];
  /** Filtered tree (tupleset-dep nodes removed) */
  children: ResolutionBranch[];
  /** Number of terminal leaf nodes in the subtree */
  terminalCount: number;
  /** Max depth from group root to any terminal */
  maxDepth: number;
  /** Whether this group has deep resolution chains (maxDepth > 2) */
  isDeep: boolean;
}

/** Answer line item */
export interface AnswerLineItem {
  label: string;
  kind: "ttu" | "computed" | "direct";
}

/** Recursively remove tupleset-dep branches (binding plumbing) from the tree */
function filterTuplesetDepNodes(branches: ResolutionBranch[]): ResolutionBranch[] {
  const result: ResolutionBranch[] = [];
  for (const branch of branches) {
    if (branch.edgeType === "tupleset-dep") continue;
    result.push({
      ...branch,
      children: filterTuplesetDepNodes(branch.children),
    });
  }
  return result;
}

/** Compute terminal count and max depth of a branch tree */
function computeMetrics(
  branches: ResolutionBranch[],
  depth: number,
): { terminalCount: number; maxDepth: number } {
  let terminalCount = 0;
  let maxDepth = depth;
  for (const branch of branches) {
    if (branch.isTerminal || branch.children.length === 0) {
      terminalCount++;
      maxDepth = Math.max(maxDepth, depth + 1);
    } else {
      const sub = computeMetrics(branch.children, depth + 1);
      terminalCount += sub.terminalCount;
      maxDepth = Math.max(maxDepth, sub.maxDepth);
    }
  }
  return { terminalCount, maxDepth };
}

/** Check if a branch represents a direct assignment (e.g., user#user) */
function isDirectAssignment(branch: ResolutionBranch): boolean {
  return branch.type === branch.relation && branch.isTerminal;
}

/** Format a role label for the answer line */
function formatAnswerRole(branch: ResolutionBranch): string {
  if (isDirectAssignment(branch)) {
    return `directly assigned [${branch.type}]`;
  }
  return `${branch.relation} on ${branch.type}`;
}

/**
 * Group a flat ResolutionBranch[] tree into ResolutionGroup[] by access vector.
 *
 * Edge type semantics from the parser:
 * - `ttu` branches: the actual through-type role (e.g., category#can_read) → GROUP these
 * - `tupleset-dep` branches: the structural binding (e.g., intellectual_property#category) → SKIP
 * - `computed` branches: same-type relation reference → local group
 * - `direct` branches: type restriction → direct item
 */
export function groupResolutionTree(tree: ResolutionBranch[]): {
  groups: ResolutionGroup[];
  answerLine: AnswerLineItem[];
} {
  const groups: ResolutionGroup[] = [];
  const answerLine: AnswerLineItem[] = [];

  // TTU groups accumulate ttu branches by dimension (branch.type).
  // Inserted into `groups` on first encounter, then mutated in-place for merges.
  const ttuGroupByType = new Map<string, ResolutionGroup>();

  // Collect tupleset-dep node IDs for hover path construction.
  // Key: dimension name (tupleset-dep's relation), Value: its nodeId
  const tuplesetDepNodeIds = new Map<string, string>();
  for (const branch of tree) {
    if (branch.edgeType === "tupleset-dep") {
      tuplesetDepNodeIds.set(branch.relation, branch.nodeId);
    }
  }

  for (const branch of tree) {
    if (branch.edgeType === "tupleset-dep") {
      // Skip — structural binding, absorbed into TTU group headers
      continue;
    }

    if (branch.edgeType === "ttu") {
      // TTU branch: the actual through-type role (e.g., category#can_read).
      // Group key is branch.type (the dimension name, e.g., "category").
      const dimension = branch.type;
      const filtered = { ...branch, children: filterTuplesetDepNodes(branch.children) };

      const existing = ttuGroupByType.get(dimension);
      if (existing) {
        existing.children.push(filtered);
        existing.answerRoles.push(formatAnswerRole(branch));
        const metrics = computeMetrics(existing.children, 0);
        existing.terminalCount = metrics.terminalCount;
        existing.maxDepth = metrics.maxDepth;
        existing.isDeep = metrics.maxDepth > 2;
      } else {
        const metrics = computeMetrics([filtered], 0);
        const group: ResolutionGroup = {
          kind: "ttu",
          label: `Via ${dimension}`,
          tuplesetRelation: dimension,
          tuplesetNodeId: tuplesetDepNodeIds.get(dimension),
          answerRoles: [formatAnswerRole(branch)],
          children: [filtered],
          terminalCount: metrics.terminalCount,
          maxDepth: metrics.maxDepth,
          isDeep: metrics.maxDepth > 2,
        };
        ttuGroupByType.set(dimension, group);
        groups.push(group);
      }

      answerLine.push({ label: formatAnswerRole(branch), kind: "ttu" });
      continue;
    }

    if (branch.edgeType === "computed") {
      const filtered = filterTuplesetDepNodes(branch.children);
      const wrappedBranch = { ...branch, children: filtered };
      const metrics = computeMetrics([wrappedBranch], 0);
      groups.push({
        kind: "computed",
        label: `${branch.relation} (local)`,
        answerRoles: [formatAnswerRole(branch)],
        children: [wrappedBranch],
        terminalCount: metrics.terminalCount,
        maxDepth: metrics.maxDepth,
        isDeep: metrics.maxDepth > 2,
      });
      answerLine.push({ label: formatAnswerRole(branch), kind: "computed" });
      continue;
    }

    if (branch.edgeType === "direct") {
      const label = isDirectAssignment(branch)
        ? `directly assigned [${branch.type}]`
        : `${branch.relation} on ${branch.type}`;
      groups.push({
        kind: "direct",
        label,
        answerRoles: [formatAnswerRole(branch)],
        children: [branch],
        terminalCount: 1,
        maxDepth: 1,
        isDeep: false,
      });
      answerLine.push({ label: formatAnswerRole(branch), kind: "direct" });
    }
  }

  return { groups, answerLine };
}
