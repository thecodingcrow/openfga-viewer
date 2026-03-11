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

export interface PersistedAnchor {
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

/** Flag to prevent pushState during popstate restoration */
let _restoringFromHistory = false;

function pushAnchorState(state: PersistedAnchor | null): void {
  if (_restoringFromHistory) return;
  window.history.pushState({ anchor: state }, '');
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

// ─── Anchor restoration ─────────────────────────────────────────────────────

function restoreAnchor(
  persisted: PersistedAnchor,
  nodes: AuthorizationNode[],
  edges: AuthorizationEdge[],
): Anchor | null {
  switch (persisted.kind) {
    case 'permission': {
      if (!persisted.nodeId || !nodes.some((n) => n.id === persisted.nodeId)) return null;
      const result = resolvePermission(persisted.nodeId, nodes, edges);
      return { kind: 'permission', nodeId: persisted.nodeId, result };
    }
    case 'role': {
      if (!persisted.nodeId || !nodes.some((n) => n.id === persisted.nodeId)) return null;
      const result = auditRole(persisted.nodeId, nodes, edges);
      return { kind: 'role', nodeId: persisted.nodeId, result };
    }
    case 'checker': {
      if (!persisted.subjectNodeId || !persisted.targetNodeId) return null;
      if (
        !nodes.some((n) => n.id === persisted.subjectNodeId) ||
        !nodes.some((n) => n.id === persisted.targetNodeId)
      ) return null;
      const result = checkPermission(persisted.subjectNodeId, persisted.targetNodeId, nodes, edges);
      return {
        kind: 'checker',
        subjectNodeId: persisted.subjectNodeId,
        targetNodeId: persisted.targetNodeId,
        result,
      };
    }
  }
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
  restoreAnchorFromHistory: (persisted: PersistedAnchor | null) => void;
  toggleShowAllTypes: () => void;

  setReactFlowInstance: (instance: ReactFlowInstance | null) => void;
}

// ─── Store implementation ───────────────────────────────────────────────────

export const useViewerStore = create<ViewerStore>((set, get) => {
  function applyAnchor(
    anchor: Anchor,
    recentIds: string[],
    persistPayload: PersistedAnchor,
  ): void {
    const { recentlyVisited, availableTypes, nodes, edges } = get();
    const updatedRecent = [
      ...recentIds,
      ...recentlyVisited.filter((id) => !recentIds.includes(id)),
    ].slice(0, 10);
    const visibility = computeVisibility(anchor, false, availableTypes, nodes, edges);
    set({ anchor, recentlyVisited: updatedRecent, showAllTypes: false, ...visibility });
    persistAnchor(persistPayload);
    pushAnchorState(persistPayload);
  }

  return {
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
      // Try to restore persisted anchor first, then decide visibility
      const persisted = loadPersistedAnchor();
      let restoredAnchor: Anchor | null = null;

      if (persisted) {
        restoredAnchor = restoreAnchor(persisted, nodes, edges);
      }

      if (restoredAnchor) {
        const visibility = computeVisibility(restoredAnchor, false, availableTypes, nodes, edges);
        set({
          nodes,
          edges,
          availableTypes,
          dimensions,
          parseVersion,
          parseError: null,
          anchor: restoredAnchor,
          ...visibility,
        });
        window.history.replaceState({ anchor: persisted }, '');
      } else {
        // No anchor to restore — show all types so the graph isn't empty
        set({
          nodes,
          edges,
          availableTypes,
          dimensions,
          parseVersion,
          parseError: null,
          anchor: null,
          showAllTypes: true,
          visibleTypeNames: availableTypes,
          visibleEdges: edges,
        });
        window.history.replaceState({ anchor: null }, '');
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

  // ── Anchor actions ──────────────────────────────────────────────────────

  setAnchorType: (anchorType) => set({ anchorType }),

  setPermissionAnchor: (nodeId) => {
    const { nodes, edges } = get();
    const result = resolvePermission(nodeId, nodes, edges);
    applyAnchor(
      { kind: 'permission', nodeId, result },
      [nodeId],
      { kind: 'permission', nodeId },
    );
  },

  setRoleAnchor: (nodeId) => {
    const { nodes, edges } = get();
    const result = auditRole(nodeId, nodes, edges);
    applyAnchor(
      { kind: 'role', nodeId, result },
      [nodeId],
      { kind: 'role', nodeId },
    );
  },

  setCheckerAnchor: (subjectId, targetId) => {
    const { nodes, edges } = get();
    const result = checkPermission(subjectId, targetId, nodes, edges);
    applyAnchor(
      { kind: 'checker', subjectNodeId: subjectId, targetNodeId: targetId, result },
      [targetId, subjectId],
      { kind: 'checker', subjectNodeId: subjectId, targetNodeId: targetId },
    );
  },

  clearAnchor: () => {
    const { availableTypes, edges } = get();
    set({
      anchor: null,
      showAllTypes: true,
      visibleTypeNames: availableTypes,
      visibleEdges: edges,
    });
    clearPersistedAnchor();
    pushAnchorState(null);
  },

  restoreAnchorFromHistory: (persisted) => {
    _restoringFromHistory = true;
    if (!persisted) {
      set({ anchor: null, visibleTypeNames: [], visibleEdges: [] });
    } else {
      const { nodes, edges, showAllTypes, availableTypes } = get();
      const newAnchor = restoreAnchor(persisted, nodes, edges);
      if (newAnchor) {
        const visibility = computeVisibility(newAnchor, showAllTypes, availableTypes, nodes, edges);
        set({ anchor: newAnchor, ...visibility });
      } else {
        set({ anchor: null, visibleTypeNames: [], visibleEdges: [] });
      }
    }
    _restoringFromHistory = false;
  },

  toggleShowAllTypes: () => {
    const { showAllTypes, anchor, availableTypes, nodes, edges } = get();
    const newShowAllTypes = !showAllTypes;
    const visibility = computeVisibility(anchor, newShowAllTypes, availableTypes, nodes, edges);
    set({ showAllTypes: newShowAllTypes, ...visibility });
  },
};
});
