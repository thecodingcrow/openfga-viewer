import { create } from "zustand";

const EMPTY_SET = new Set<string>();

interface HoverStore {
  // Pre-computed highlight sets
  highlightedEdgeIds: Set<string>;

  // Whether any hover is active (for dimming logic)
  isHoverActive: boolean;

  // Actions
  setHighlightedEdges: (edgeIds: string[]) => void;
  clearHover: () => void;
}

const CLEAR_STATE = {
  highlightedEdgeIds: EMPTY_SET,
  isHoverActive: false,
} as const;

export const useHoverStore = create<HoverStore>((set) => ({
  ...CLEAR_STATE,

  setHighlightedEdges: (edgeIds) => {
    if (edgeIds.length === 0) {
      set(CLEAR_STATE);
      return;
    }
    set({
      highlightedEdgeIds: new Set(edgeIds),
      isHoverActive: true,
    });
  },

  clearHover: () => set(CLEAR_STATE),
}));
