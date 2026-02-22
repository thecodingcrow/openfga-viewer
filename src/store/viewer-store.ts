import { startTransition } from "react";
import { create } from "zustand";
import type {
  AuthorizationNode,
  AuthorizationEdge,
  AuthorizationGraph,
  Dimension,
  LayoutDirection,
  FocusMode,
  GraphFilters,
  NavigationFrame,
  SelfReferencingDimension,
} from "../types";
import { buildAuthorizationGraph } from "../parser/parse-model";
import { SAMPLE_FGA_MODEL } from "../parser/sample-model";
import { detectDimensions } from "../dimensions/detect";
import { assignDimensionColors } from "../theme/dimensions";
import {
  computeNeighborhood,
  applyFilters,
  extractTypeNames,
  computeSubgraph,
  detectSelfReferencingDimensions,
} from "../graph/traversal";
import type { ReactFlowInstance } from "@xyflow/react";

const STORAGE_KEY = "openfga-viewer-source";

const loadPersistedSource = (): string =>
  localStorage.getItem(STORAGE_KEY) ?? SAMPLE_FGA_MODEL;

const DEFAULT_FILTERS: GraphFilters = {
  types: [],
};

// Memoized visible graph cache — recomputes only when inputs change
let _cachedVisibleNodes: AuthorizationNode[] = [];
let _cachedVisibleEdges: AuthorizationEdge[] = [];
let _cacheKey = "";
let _cachedFiltersStr = JSON.stringify(DEFAULT_FILTERS);

function visibleGraphCacheKey(
  parseVersion: number,
  nodes: AuthorizationNode[],
  edges: AuthorizationEdge[],
  filtersStr: string,
  focusMode: FocusMode,
  selectedNodeId: string | null,
  neighborhoodHops: number,
): string {
  // Only include selectedNodeId/neighborhoodHops when they matter
  if (focusMode === "overview") {
    return `${parseVersion}|${nodes.length}|${edges.length}|${filtersStr}|overview`;
  }
  return `${parseVersion}|${nodes.length}|${edges.length}|${filtersStr}|${focusMode}|${selectedNodeId}|${neighborhoodHops}`;
}

// ─── Store shape ────────────────────────────────────────────────────────────

interface ViewerStore {
  // Source
  fgaSource: string;
  parseError: string | null;

  // Full graph (unfiltered)
  nodes: AuthorizationNode[];
  edges: AuthorizationEdge[];
  availableTypes: string[];
  dimensions: Map<string, Dimension>;
  parseVersion: number;

  // Layout
  layoutDirection: LayoutDirection;

  // Exploration
  focusMode: FocusMode;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  neighborhoodHops: number;

  // Filters
  filters: GraphFilters;

  // Navigation
  navigationStack: NavigationFrame[];
  collapsedCards: Set<string>;
  dimmedRowsHidden: boolean;
  recentlyVisited: string[];
  selfReferencingDimensions: SelfReferencingDimension[];

  // UI
  panelOpen: boolean;
  panelTab: 'editor' | 'inspector';
  searchOpen: boolean;
  reactFlowInstance: ReactFlowInstance | null;

  // ── Actions ──
  setSource: (src: string) => void;
  parse: (src?: string) => void;
  setLayoutDirection: (dir: LayoutDirection) => void;

  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;

  setFocusMode: (mode: FocusMode) => void;
  setNeighborhoodHops: (hops: number) => void;

  setFilter: (partial: Partial<GraphFilters>) => void;
  resetFilters: () => void;

  // Navigation actions
  navigateToSubgraph: (nodeId: string, direction: 'upstream' | 'downstream') => void;
  popSubgraph: () => void;
  jumpToLevel: (index: number) => void;

  // Card collapse
  toggleCardCollapse: (typeName: string) => void;

  // Dimmed rows toggle
  toggleDimmedRowsHidden: () => void;

  setReactFlowInstance: (instance: ReactFlowInstance | null) => void;
  togglePanel: () => void;
  setPanelOpen: (open: boolean) => void;
  setPanelTab: (tab: 'editor' | 'inspector') => void;
  toggleSearch: () => void;
  setSearchOpen: (open: boolean) => void;

  /** Derived: filtered + focus-mode-scoped graph for rendering */
  getVisibleGraph: () => AuthorizationGraph;
}

// ─── Store implementation ───────────────────────────────────────────────────

export const useViewerStore = create<ViewerStore>((set, get) => ({
  fgaSource: loadPersistedSource(),
  parseError: null,
  nodes: [],
  edges: [],
  availableTypes: [],
  dimensions: new Map(),
  parseVersion: 0,
  layoutDirection: "TB" as LayoutDirection,
  focusMode: "overview",
  selectedNodeId: null,
  selectedEdgeId: null,
  neighborhoodHops: 1,
  filters: { ...DEFAULT_FILTERS },
  navigationStack: [],
  collapsedCards: new Set(),
  dimmedRowsHidden: false,
  recentlyVisited: [],
  selfReferencingDimensions: [],
  panelOpen: true,
  panelTab: 'editor' as const,
  searchOpen: false,
  reactFlowInstance: null,

  setSource: (src) => {
    set({ fgaSource: src });
    localStorage.setItem(STORAGE_KEY, src);
  },

  parse: (src) => {
    const source = src ?? get().fgaSource;
    try {
      const { nodes, edges } = buildAuthorizationGraph(source);
      const parseVersion = get().parseVersion + 1;
      const rawDimensions = detectDimensions({ nodes, edges });
      const dimensions = assignDimensionColors(rawDimensions);
      const selfReferencingDimensions = detectSelfReferencingDimensions(edges);
      set({
        nodes,
        edges,
        availableTypes: extractTypeNames(nodes),
        dimensions,
        selfReferencingDimensions,
        parseVersion,
        parseError: null,
        selectedNodeId: null,
        selectedEdgeId: null,
        focusMode: "overview",
        navigationStack: [],
        collapsedCards: new Set(),
      });
    } catch (e) {
      set({
        parseError: e instanceof Error ? e.message : String(e),
        nodes: [],
        edges: [],
        availableTypes: [],
        dimensions: new Map(),
        selfReferencingDimensions: [],
        parseVersion: get().parseVersion + 1,
        selectedNodeId: null,
        selectedEdgeId: null,
        focusMode: "overview",
        navigationStack: [],
        collapsedCards: new Set(),
      });
    }
  },

  setLayoutDirection: (layoutDirection) => set({ layoutDirection }),

  selectNode: (id) => {
    startTransition(() => {
      const { focusMode } = get();
      if (focusMode === "overview" && id !== null) {
        set({ selectedNodeId: id, focusMode: "neighborhood" });
      } else if (focusMode === "neighborhood" && id === get().selectedNodeId) {
        set({ selectedNodeId: null, focusMode: "overview" });
      } else {
        set({ selectedNodeId: id });
      }
    });
  },

  selectEdge: (selectedEdgeId) => set({ selectedEdgeId }),

  setFocusMode: (focusMode) => {
    startTransition(() => {
      if (focusMode === "overview") {
        set({
          focusMode,
          selectedNodeId: null,
        });
      } else {
        set({ focusMode });
      }
    });
  },

  setNeighborhoodHops: (neighborhoodHops) => set({ neighborhoodHops }),

  setFilter: (partial) => {
    startTransition(() => {
      set((s) => {
        const filters = { ...s.filters, ...partial };
        _cachedFiltersStr = JSON.stringify(filters);
        return { filters };
      });
    });
  },

  resetFilters: () => {
    _cachedFiltersStr = JSON.stringify(DEFAULT_FILTERS);
    set({ filters: { ...DEFAULT_FILTERS } });
  },

  // ─── Navigation actions ──────────────────────────────────────────────────

  navigateToSubgraph: (nodeId, direction) => {
    startTransition(() => {
      const { nodes, edges, navigationStack, recentlyVisited } = get();

      // Compute subgraph with intra-card expansion
      const { visibleTypeIds, relevantRowIds } = computeSubgraph(
        nodeId,
        direction,
        nodes,
        edges,
      );

      // Build navigation frame
      const frame: NavigationFrame = {
        entryNodeId: nodeId,
        direction,
        label: nodeId,
        visibleTypeIds,
        relevantRowIds,
      };

      // Update recently visited: prepend, deduplicate, keep last 5
      const updatedRecent = [nodeId, ...recentlyVisited.filter((id) => id !== nodeId)].slice(0, 5);

      const newStack = [...navigationStack, frame];

      set({
        navigationStack: newStack,
        recentlyVisited: updatedRecent,
      });

      // Push browser history state for back-button support
      window.history.pushState({ stackDepth: newStack.length }, '');
    });
  },

  popSubgraph: () => {
    startTransition(() => {
      const { navigationStack } = get();
      if (navigationStack.length === 0) return;

      set({
        navigationStack: navigationStack.slice(0, -1),
      });
      // Do NOT call history.back() or history.pushState here —
      // this action is called BY the popstate handler.
    });
  },

  jumpToLevel: (index) => {
    startTransition(() => {
      const { navigationStack } = get();
      if (index <= 0) {
        set({ navigationStack: [] });
        return;
      }
      if (index >= navigationStack.length) return;
      set({ navigationStack: navigationStack.slice(0, index) });
    });
  },

  // ─── Card collapse ──────────────────────────────────────────────────────

  toggleCardCollapse: (typeName) => {
    const newSet = new Set(get().collapsedCards);
    if (newSet.has(typeName)) {
      newSet.delete(typeName);
    } else {
      newSet.add(typeName);
    }
    set({ collapsedCards: newSet });
  },

  // ─── Dimmed rows toggle ─────────────────────────────────────────────────

  toggleDimmedRowsHidden: () => {
    set((s) => ({ dimmedRowsHidden: !s.dimmedRowsHidden }));
  },

  setReactFlowInstance: (reactFlowInstance) => set({ reactFlowInstance }),
  togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),
  setPanelOpen: (open) => set({ panelOpen: open }),
  setPanelTab: (tab) => set({ panelTab: tab, panelOpen: true }),
  toggleSearch: () => set((s) => ({ searchOpen: !s.searchOpen })),
  setSearchOpen: (open) => set({ searchOpen: open }),

  getVisibleGraph: () => {
    const {
      nodes,
      edges,
      filters,
      focusMode,
      selectedNodeId,
      neighborhoodHops,
      parseVersion,
    } = get();

    const key = visibleGraphCacheKey(
      parseVersion,
      nodes,
      edges,
      _cachedFiltersStr,
      focusMode,
      selectedNodeId,
      neighborhoodHops,
    );
    if (_cacheKey === key) {
      return { nodes: _cachedVisibleNodes, edges: _cachedVisibleEdges };
    }

    // 1. Apply filters
    let { nodes: visible, edges: visibleEdges } = applyFilters(
      nodes,
      edges,
      filters,
    );

    // 2. Apply focus mode scoping
    if (focusMode === "neighborhood" && selectedNodeId) {
      ({ nodes: visible, edges: visibleEdges } = computeNeighborhood(
        visible,
        visibleEdges,
        selectedNodeId,
        neighborhoodHops,
      ));
    }

    _cacheKey = key;
    _cachedVisibleNodes = visible;
    _cachedVisibleEdges = visibleEdges;
    return { nodes: visible, edges: visibleEdges };
  },
}));
