import { create } from "zustand";
import type { AuthorizationEdge } from "../types";
import { expandViaTtu } from "../graph/traversal";

const EMPTY_SET = new Set<string>();

interface HoverStore {
  hoveredNodeId: string | null;
  expandedNodeIds: Set<string>;
  setHoveredNode: (id: string | null, allEdges?: AuthorizationEdge[]) => void;
}

export const useHoverStore = create<HoverStore>((set) => ({
  hoveredNodeId: null,
  expandedNodeIds: EMPTY_SET,
  setHoveredNode: (hoveredNodeId, allEdges) =>
    set({
      hoveredNodeId,
      expandedNodeIds:
        hoveredNodeId && allEdges
          ? expandViaTtu(hoveredNodeId, allEdges)
          : EMPTY_SET,
    }),
}));
