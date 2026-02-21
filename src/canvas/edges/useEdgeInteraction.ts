import { useMemo } from 'react';
import { useHoverStore } from '../../store/hover-store';
import { useViewerStore } from '../../store/viewer-store';
import { blueprint } from '../../theme/colors';

type EdgeType = 'direct' | 'computed' | 'tupleset-dep';

interface EdgeVisuals {
  stroke: string;
  strokeWidth: number;
  opacity: number;
  filter: string | undefined;
  zIndex: number;
}

// Rest state per edge type
const REST: Record<EdgeType, EdgeVisuals> = {
  direct:   { stroke: blueprint.edgeDirect,   strokeWidth: 1.5, opacity: 0.55, filter: undefined, zIndex: 0 },
  computed: { stroke: blueprint.edgeComputed,  strokeWidth: 1.5, opacity: 0.65, filter: undefined, zIndex: 0 },
  'tupleset-dep': { stroke: blueprint.edgeTuplesetDep, strokeWidth: 1.5, opacity: 0.50, filter: undefined, zIndex: 0 },
};

// Active (hovered-connected / selected / traced) state
const ACTIVE: Record<EdgeType, EdgeVisuals> = {
  direct:   { stroke: blueprint.edgeDirectActive,   strokeWidth: 1.5, opacity: 0.85, filter: undefined, zIndex: 10 },
  computed: { stroke: blueprint.edgeComputedActive,  strokeWidth: 2.0, opacity: 1.0,  filter: undefined, zIndex: 10 },
  'tupleset-dep': { stroke: blueprint.edgeTuplesetDepActive, strokeWidth: 2.0, opacity: 0.90, filter: undefined, zIndex: 10 },
};

const DIMMED_OPACITY = 0.08;
const PATH_DIMMED_OPACITY = 0.06;

export function useEdgeInteraction(
  edgeId: string,
  source: string,
  target: string,
  edgeType: EdgeType,
): EdgeVisuals {
  const hoveredNodeId = useHoverStore((s) => s.hoveredNodeId);
  const expandedNodeIds = useHoverStore((s) => s.expandedNodeIds);
  const selectedEdgeId = useViewerStore((s) => s.selectedEdgeId);
  const tracedEdgeIds = useViewerStore((s) => s.tracedEdgeIds);

  return useMemo(() => {
    const rest = REST[edgeType];
    const active = ACTIVE[edgeType];

    // 1. Path-trace mode takes priority
    if (tracedEdgeIds) {
      if (tracedEdgeIds.has(edgeId)) return active;
      return { ...rest, opacity: PATH_DIMMED_OPACITY, filter: undefined, zIndex: 0 };
    }

    // 2. Selected edge
    if (selectedEdgeId === edgeId) return active;

    // 3. Node hover — use expanded set (includes TTU-reachable nodes)
    if (hoveredNodeId) {
      const connected = expandedNodeIds.has(source) || expandedNodeIds.has(target);
      if (connected) return active;
      return { ...rest, opacity: DIMMED_OPACITY, filter: undefined, zIndex: 0 };
    }

    // 4. Default rest state
    return rest;
  }, [edgeId, source, target, edgeType, hoveredNodeId, expandedNodeIds, selectedEdgeId, tracedEdgeIds]);
}
