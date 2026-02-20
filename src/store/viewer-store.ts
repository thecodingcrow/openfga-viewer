import { startTransition } from "react";
import { create } from "zustand";
import type {
  AuthorizationNode,
  AuthorizationEdge,
  AuthorizationGraph,
  LayoutDirection,
  FocusMode,
  GraphFilters,
} from "../types";
import { buildAuthorizationGraph } from "../parser/parse-model";
import { SAMPLE_FGA_MODEL } from "../parser/sample-model";
import {
  computeNeighborhood,
  findPaths,
  collectPathElements,
  applyFilters,
  extractTypeNames,
} from "../graph/traversal";
import type { ReactFlowInstance } from "@xyflow/react";

const STORAGE_KEY = "openfga-viewer-source";
const EDITOR_WIDTH_KEY = "openfga-viewer-editor-width";

export const DEFAULT_EDITOR_WIDTH = 520;
export const MIN_EDITOR_WIDTH = 250;
export const MAX_EDITOR_WIDTH_RATIO = 0.5;

const loadPersistedSource = (): string =>
  localStorage.getItem(STORAGE_KEY) ?? SAMPLE_FGA_MODEL;

const loadPersistedEditorWidth = (): number => {
  const raw = localStorage.getItem(EDITOR_WIDTH_KEY);
  if (!raw) return DEFAULT_EDITOR_WIDTH;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(MIN_EDITOR_WIDTH, n) : DEFAULT_EDITOR_WIDTH;
};

const DEFAULT_FILTERS: GraphFilters = {
  types: [],
  permissionsOnly: false,
  showTtuEdges: false,
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
  parseVersion: number;

  // Layout
  layoutDirection: LayoutDirection;

  // Exploration
  focusMode: FocusMode;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  neighborhoodHops: number;

  // Path tracing
  pathStart: string | null;
  pathEnd: string | null;
  tracedPaths: string[][] | null;
  tracedNodeIds: Set<string> | null;
  tracedEdgeIds: Set<string> | null;

  // Filters
  filters: GraphFilters;

  // UI
  editorOpen: boolean;
  editorWidth: number;
  legendOpen: boolean;
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

  setPathStart: (id: string | null) => void;
  setPathEnd: (id: string | null) => void;
  tracePath: () => void;
  clearPath: () => void;

  setFilter: (partial: Partial<GraphFilters>) => void;
  resetFilters: () => void;

  setReactFlowInstance: (instance: ReactFlowInstance | null) => void;
  toggleEditor: () => void;
  setEditorOpen: (open: boolean) => void;
  setEditorWidth: (w: number) => void;
  toggleLegend: () => void;
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
  parseVersion: 0,
  layoutDirection: "TB" as LayoutDirection,
  focusMode: "overview",
  selectedNodeId: null,
  selectedEdgeId: null,
  neighborhoodHops: 1,
  pathStart: null,
  pathEnd: null,
  tracedPaths: null,
  tracedNodeIds: null,
  tracedEdgeIds: null,
  filters: { ...DEFAULT_FILTERS },
  editorOpen: true,
  editorWidth: loadPersistedEditorWidth(),
  legendOpen: false,
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
      set({
        nodes,
        edges,
        availableTypes: extractTypeNames(nodes),
        parseVersion,
        parseError: null,
        selectedNodeId: null,
        selectedEdgeId: null,
        focusMode: "overview",
        pathStart: null,
        pathEnd: null,
        tracedPaths: null,
        tracedNodeIds: null,
        tracedEdgeIds: null,
      });
    } catch (e) {
      set({
        parseError: e instanceof Error ? e.message : String(e),
        nodes: [],
        edges: [],
        availableTypes: [],
        parseVersion: get().parseVersion + 1,
        selectedNodeId: null,
        selectedEdgeId: null,
        focusMode: "overview",
        pathStart: null,
        pathEnd: null,
        tracedPaths: null,
        tracedNodeIds: null,
        tracedEdgeIds: null,
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
          pathStart: null,
          pathEnd: null,
          tracedPaths: null,
          tracedNodeIds: null,
          tracedEdgeIds: null,
        });
      } else {
        set({ focusMode });
      }
    });
  },

  setNeighborhoodHops: (neighborhoodHops) => set({ neighborhoodHops }),

  setPathStart: (pathStart) => {
    set({
      pathStart,
      focusMode: "path",
      tracedPaths: null,
      tracedNodeIds: null,
      tracedEdgeIds: null,
    });
  },

  setPathEnd: (pathEnd) => {
    set({
      pathEnd,
      focusMode: "path",
      tracedPaths: null,
      tracedNodeIds: null,
      tracedEdgeIds: null,
    });
  },

  tracePath: () => {
    const { pathStart, pathEnd, edges } = get();
    if (!pathStart || !pathEnd) return;
    const paths = findPaths(edges, pathStart, pathEnd);
    const { nodeIds, edgeIds } = collectPathElements(edges, paths);
    set({ tracedPaths: paths, tracedNodeIds: nodeIds, tracedEdgeIds: edgeIds });
  },

  clearPath: () =>
    set({
      pathStart: null,
      pathEnd: null,
      tracedPaths: null,
      tracedNodeIds: null,
      tracedEdgeIds: null,
      focusMode: "overview",
    }),

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

  setReactFlowInstance: (reactFlowInstance) => set({ reactFlowInstance }),
  toggleEditor: () => set((s) => ({ editorOpen: !s.editorOpen })),
  setEditorOpen: (open) => set({ editorOpen: open }),
  setEditorWidth: (w) => {
    const clamped = Math.max(MIN_EDITOR_WIDTH, Math.min(w, window.innerWidth * MAX_EDITOR_WIDTH_RATIO));
    localStorage.setItem(EDITOR_WIDTH_KEY, String(clamped));
    set({ editorWidth: clamped });
  },
  toggleLegend: () => set((s) => ({ legendOpen: !s.legendOpen })),
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
