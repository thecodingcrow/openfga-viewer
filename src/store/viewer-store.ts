import { create } from "zustand";
import type {
  AuthorizationNode,
  AuthorizationEdge,
  Dimension,
  LayoutDirection,
  Anchor,
} from "../types";
import { buildAuthorizationGraph } from "../parser/parse-model";
import { SAMPLE_FGA_MODEL } from "../parser/sample-model";
import { resolvePermission, auditRole, checkPermission } from "../graph/resolution";
import { detectDimensions } from "../dimensions/detect";
import { assignDimensionColors } from "../theme/dimensions";
import { extractTypeNames } from "../graph/traversal";
import type { ReactFlowInstance } from "@xyflow/react";
import type { ResolutionBranch } from "../graph/resolution-types";

const STORAGE_KEY = "openfga-viewer-source";

const loadPersistedSource = (): string =>
  localStorage.getItem(STORAGE_KEY) ?? SAMPLE_FGA_MODEL;

// ─── Anchor persistence ─────────────────────────────────────────────────────

const ANCHOR_STORAGE_KEY = "openfga-viewer-anchor";

interface PersistedAnchor {
  kind: 'permission' | 'role' | 'checker';
  nodeId?: string;
  subjectNodeId?: string;
  targetNodeId?: string;
}

function persistAnchor(anchor: PersistedAnchor): void {
  try {
    localStorage.setItem(ANCHOR_STORAGE_KEY, JSON.stringify(anchor));
  } catch {
    // localStorage full or unavailable
  }
}

function clearPersistedAnchor(): void {
  localStorage.removeItem(ANCHOR_STORAGE_KEY);
}

function loadPersistedAnchor(): PersistedAnchor | null {
  try {
    const raw = localStorage.getItem(ANCHOR_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedAnchor;
  } catch {
    return null;
  }
}

// ─── Anchor → visible types extraction ──────────────────────────────────────

function collectTypesFromResolutionTree(
  branches: ResolutionBranch[],
  types: Set<string>,
): void {
  for (const branch of branches) {
    types.add(branch.type);
    collectTypesFromResolutionTree(branch.children, types);
  }
}

// ─── Anchor → visibility computation ─────────────────────────────────────────

function computeVisibility(
  anchor: Anchor | null,
  showAllTypes: boolean,
  availableTypes: string[],
  nodes: AuthorizationNode[],
  edges: AuthorizationEdge[],
): { visibleTypeNames: string[]; visibleEdges: AuthorizationEdge[] } {
  if (showAllTypes) {
    return { visibleTypeNames: availableTypes, visibleEdges: edges };
  }

  if (!anchor) {
    return { visibleTypeNames: [], visibleEdges: [] };
  }

  const types = new Set<string>();

  switch (anchor.kind) {
    case 'permission': {
      const permNode = nodes.find((n) => n.id === anchor.nodeId);
      if (permNode) types.add(permNode.type);
      collectTypesFromResolutionTree(anchor.result.tree, types);
      break;
    }
    case 'role': {
      const roleNode = nodes.find((n) => n.id === anchor.nodeId);
      if (roleNode) types.add(roleNode.type);
      for (const typeName of anchor.result.permissions.keys()) {
        types.add(typeName);
      }
      break;
    }
    case 'checker': {
      const subjectNode = nodes.find((n) => n.id === anchor.subjectNodeId);
      const targetNode = nodes.find((n) => n.id === anchor.targetNodeId);
      if (subjectNode) types.add(subjectNode.type);
      if (targetNode) types.add(targetNode.type);
      if (anchor.result.path) {
        for (const nodeId of anchor.result.path) {
          types.add(nodeId.split('#')[0]);
        }
      }
      break;
    }
  }

  const visibleTypeNames = [...types].sort();
  const visibleTypesSet = new Set(visibleTypeNames);
  const visibleEdges = edges.filter((e) => {
    const sourceType = e.source.split('#')[0];
    const targetType = e.target.split('#')[0];
    return visibleTypesSet.has(sourceType) && visibleTypesSet.has(targetType);
  });

  return { visibleTypeNames, visibleEdges };
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

  // ── Anchor ──
  anchor: Anchor | null;
  showAllTypes: boolean;
  visibleTypeNames: string[];
  visibleEdges: AuthorizationEdge[];
  /** The type name containing the currently selected anchor */
  anchorType: string | null;

  // Recently visited (used by SearchBar)
  recentlyVisited: string[];

  // UI
  panelOpen: boolean;
  reactFlowInstance: ReactFlowInstance | null;

  // ── Actions ──
  setSource: (src: string) => void;
  parse: (src?: string) => void;
  setLayoutDirection: (dir: LayoutDirection) => void;

  // ── Anchor actions ──
  setAnchorType: (typeName: string | null) => void;
  setPermissionAnchor: (nodeId: string) => void;
  setRoleAnchor: (nodeId: string) => void;
  setCheckerAnchor: (subjectId: string, targetId: string) => void;
  clearAnchor: () => void;
  toggleShowAllTypes: () => void;

  setReactFlowInstance: (instance: ReactFlowInstance | null) => void;
  togglePanel: () => void;
  setPanelOpen: (open: boolean) => void;
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
  anchor: null,
  showAllTypes: false,
  visibleTypeNames: [],
  visibleEdges: [],
  anchorType: null,
  recentlyVisited: [],
  panelOpen: true,
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
      const availableTypes = extractTypeNames(nodes);
      set({
        nodes,
        edges,
        availableTypes,
        dimensions,
        parseVersion,
        parseError: null,
        anchor: null,
        visibleTypeNames: [],
        visibleEdges: [],
      });

      // Recompute persisted anchor
      const persisted = loadPersistedAnchor();
      if (persisted) {
        const freshNodes = get().nodes;
        const freshEdges = get().edges;
        const { showAllTypes } = get();
        const freshAvailableTypes = get().availableTypes;
        let newAnchor: Anchor | null = null;

        if (persisted.kind === 'permission' && persisted.nodeId) {
          const nodeExists = freshNodes.some((n) => n.id === persisted.nodeId);
          if (nodeExists) {
            const result = resolvePermission(persisted.nodeId, freshNodes, freshEdges);
            newAnchor = { kind: 'permission', nodeId: persisted.nodeId, result };
          }
        } else if (persisted.kind === 'role' && persisted.nodeId) {
          const nodeExists = freshNodes.some((n) => n.id === persisted.nodeId);
          if (nodeExists) {
            const result = auditRole(persisted.nodeId, freshNodes, freshEdges);
            newAnchor = { kind: 'role', nodeId: persisted.nodeId, result };
          }
        } else if (persisted.kind === 'checker' && persisted.subjectNodeId && persisted.targetNodeId) {
          const subjectExists = freshNodes.some((n) => n.id === persisted.subjectNodeId);
          const targetExists = freshNodes.some((n) => n.id === persisted.targetNodeId);
          if (subjectExists && targetExists) {
            const result = checkPermission(persisted.subjectNodeId, persisted.targetNodeId, freshNodes, freshEdges);
            newAnchor = {
              kind: 'checker',
              subjectNodeId: persisted.subjectNodeId,
              targetNodeId: persisted.targetNodeId,
              result,
            };
          }
        }

        if (newAnchor) {
          const visibility = computeVisibility(newAnchor, showAllTypes, freshAvailableTypes, freshNodes, freshEdges);
          set({ anchor: newAnchor, ...visibility });
        }
      }
    } catch (e) {
      set({
        parseError: e instanceof Error ? e.message : String(e),
        nodes: [],
        edges: [],
        availableTypes: [],
        dimensions: new Map(),
        parseVersion: get().parseVersion + 1,
        anchor: null,
        visibleTypeNames: [],
        visibleEdges: [],
      });
    }
  },

  setLayoutDirection: (layoutDirection) => set({ layoutDirection }),

  setReactFlowInstance: (reactFlowInstance) => set({ reactFlowInstance }),
  togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),
  setPanelOpen: (open) => set({ panelOpen: open }),

  // ── Anchor actions ──────────────────────────────────────────────────────

  setAnchorType: (anchorType) => set({ anchorType }),

  setPermissionAnchor: (nodeId) => {
    const { nodes, edges, recentlyVisited, showAllTypes, availableTypes } = get();
    const result = resolvePermission(nodeId, nodes, edges);
    const anchor: Anchor = { kind: 'permission', nodeId, result };
    const updatedRecent = [nodeId, ...recentlyVisited.filter((id) => id !== nodeId)].slice(0, 10);
    const visibility = computeVisibility(anchor, showAllTypes, availableTypes, nodes, edges);
    set({
      anchor,
      recentlyVisited: updatedRecent,
      ...visibility,
    });
    persistAnchor({ kind: 'permission', nodeId });
  },

  setRoleAnchor: (nodeId) => {
    const { nodes, edges, recentlyVisited, showAllTypes, availableTypes } = get();
    const result = auditRole(nodeId, nodes, edges);
    const anchor: Anchor = { kind: 'role', nodeId, result };
    const updatedRecent = [nodeId, ...recentlyVisited.filter((id) => id !== nodeId)].slice(0, 10);
    const visibility = computeVisibility(anchor, showAllTypes, availableTypes, nodes, edges);
    set({
      anchor,
      recentlyVisited: updatedRecent,
      ...visibility,
    });
    persistAnchor({ kind: 'role', nodeId });
  },

  setCheckerAnchor: (subjectId, targetId) => {
    const { nodes, edges, recentlyVisited, showAllTypes, availableTypes } = get();
    const result = checkPermission(subjectId, targetId, nodes, edges);
    const anchor: Anchor = { kind: 'checker', subjectNodeId: subjectId, targetNodeId: targetId, result };
    const updatedRecent = [
      targetId,
      subjectId,
      ...recentlyVisited.filter((id) => id !== subjectId && id !== targetId),
    ].slice(0, 10);
    const visibility = computeVisibility(anchor, showAllTypes, availableTypes, nodes, edges);
    set({
      anchor,
      recentlyVisited: updatedRecent,
      ...visibility,
    });
    persistAnchor({ kind: 'checker', subjectNodeId: subjectId, targetNodeId: targetId });
  },

  clearAnchor: () => {
    set({ anchor: null, visibleTypeNames: [], visibleEdges: [] });
    clearPersistedAnchor();
  },

  toggleShowAllTypes: () => {
    const { showAllTypes, anchor, availableTypes, nodes, edges } = get();
    const newShowAllTypes = !showAllTypes;
    const visibility = computeVisibility(anchor, newShowAllTypes, availableTypes, nodes, edges);
    set({ showAllTypes: newShowAllTypes, ...visibility });
  },
}));
