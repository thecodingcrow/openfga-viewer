import { create } from "zustand";
import type { AuthorizationNode, AuthorizationEdge } from "../types";
import { traceUpstream, traceDownstream } from "../graph/traversal";

const EMPTY_SET = new Set<string>();

interface HoverStore {
  // Current hover state
  hoveredRowId: string | null;
  hoveredCardTypeId: string | null;

  // Pre-computed highlight sets (avoid recomputation in each component)
  highlightedNodeIds: Set<string>;
  highlightedEdgeIds: Set<string>;
  highlightedRowIds: Set<string>;

  // Whether any hover is active (for dimming logic)
  isHoverActive: boolean;

  // Actions
  setHoveredRow: (
    rowId: string | null,
    edges: AuthorizationEdge[],
  ) => void;
  setHoveredCard: (
    typeId: string | null,
    nodes: AuthorizationNode[],
    edges: AuthorizationEdge[],
  ) => void;
  clearHover: () => void;
}

const CLEAR_STATE = {
  hoveredRowId: null,
  hoveredCardTypeId: null,
  highlightedNodeIds: EMPTY_SET,
  highlightedEdgeIds: EMPTY_SET,
  highlightedRowIds: EMPTY_SET,
  isHoverActive: false,
} as const;

export const useHoverStore = create<HoverStore>((set) => ({
  ...CLEAR_STATE,

  setHoveredRow: (rowId, edges) => {
    if (!rowId) {
      set(CLEAR_STATE);
      return;
    }
    const { nodeIds, edgeIds, rowIds } = traceUpstream(rowId, edges);
    set({
      hoveredRowId: rowId,
      hoveredCardTypeId: null,
      highlightedNodeIds: nodeIds,
      highlightedEdgeIds: edgeIds,
      highlightedRowIds: rowIds,
      isHoverActive: true,
    });
  },

  setHoveredCard: (typeId, nodes, edges) => {
    if (!typeId) {
      set(CLEAR_STATE);
      return;
    }
    const { nodeIds, edgeIds, rowIds } = traceDownstream(typeId, nodes, edges);
    set({
      hoveredRowId: null,
      hoveredCardTypeId: typeId,
      highlightedNodeIds: nodeIds,
      highlightedEdgeIds: edgeIds,
      highlightedRowIds: rowIds,
      isHoverActive: true,
    });
  },

  clearHover: () => set(CLEAR_STATE),
}));
