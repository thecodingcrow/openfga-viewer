import { create } from "zustand";

interface HoverStore {
  hoveredNodeId: string | null;
  setHoveredNode: (id: string | null) => void;
}

export const useHoverStore = create<HoverStore>((set) => ({
  hoveredNodeId: null,
  setHoveredNode: (hoveredNodeId) => set({ hoveredNodeId }),
}));
