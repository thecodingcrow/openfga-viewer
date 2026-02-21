import { create } from "zustand";
import type { AuthorizationEdge } from "../types";
import { expandViaTtu } from "../graph/traversal";

const EMPTY_SET = new Set<string>();

interface HoverStore {
  hoveredNodeId: string | null;
  /** TTU BFS expansion — used by edges to decide highlight vs dim */
  expandedNodeIds: Set<string>;
  /** TTU BFS + 1-hop rendered-edge neighbors — used by nodes to decide dim */
  focalNodeIds: Set<string>;
  setHoveredNode: (id: string | null, allEdges?: AuthorizationEdge[]) => void;
}

function buildHoverSets(
  hoveredNodeId: string,
  allEdges: AuthorizationEdge[],
): { expanded: Set<string>; focal: Set<string> } {
  const expanded = expandViaTtu(hoveredNodeId, allEdges);

  // Focal = expanded + 1-hop neighbors via rendered edges
  const focal = new Set(expanded);
  for (const edge of allEdges) {
    if (edge.rewriteRule === "ttu") continue;
    if (expanded.has(edge.source)) focal.add(edge.target);
    if (expanded.has(edge.target)) focal.add(edge.source);
  }

  return { expanded, focal };
}

export const useHoverStore = create<HoverStore>((set) => ({
  hoveredNodeId: null,
  expandedNodeIds: EMPTY_SET,
  focalNodeIds: EMPTY_SET,
  setHoveredNode: (hoveredNodeId, allEdges) => {
    if (hoveredNodeId && allEdges) {
      const { expanded, focal } = buildHoverSets(hoveredNodeId, allEdges);
      set({ hoveredNodeId, expandedNodeIds: expanded, focalNodeIds: focal });
    } else {
      set({ hoveredNodeId, expandedNodeIds: EMPTY_SET, focalNodeIds: EMPTY_SET });
    }
  },
}));
