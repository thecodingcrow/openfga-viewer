import { create } from "zustand";

const EMPTY_SET = new Set<string>();

export interface PathNode {
  nodeId: string;
  label: string;
}

interface HoverStore {
  // Pre-computed highlight sets
  highlightedEdgeIds: Set<string>;
  highlightedNodeIds: Set<string>;

  // Ordered path from root to hovered node (for breadcrumb)
  hoveredPath: PathNode[];

  // Whether any hover is active (for dimming logic)
  isHoverActive: boolean;

  // Actions
  setHoverHighlight: (edgeIds: string[], nodeIds: string[], path: PathNode[]) => void;
  clearHover: () => void;
}

const CLEAR_STATE = {
  highlightedEdgeIds: EMPTY_SET,
  highlightedNodeIds: EMPTY_SET,
  hoveredPath: [] as PathNode[],
  isHoverActive: false,
} as const;

export const useHoverStore = create<HoverStore>((set) => ({
  ...CLEAR_STATE,

  setHoverHighlight: (edgeIds, nodeIds, path) => {
    if (edgeIds.length === 0 && nodeIds.length === 0) {
      set(CLEAR_STATE);
      return;
    }
    set({
      highlightedEdgeIds: new Set(edgeIds),
      highlightedNodeIds: new Set(nodeIds),
      hoveredPath: path,
      isHoverActive: true,
    });
  },

  clearHover: () => set(CLEAR_STATE),
}));
