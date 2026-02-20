import { useMemo } from 'react';
import { useHoverStore } from '../../store/hover-store';
import { useViewerStore } from '../../store/viewer-store';
import { blueprint } from '../../theme/colors';

type EdgeType = 'direct' | 'computed' | 'ttu';

interface EdgeVisuals {
  stroke: string;
  strokeWidth: number;
  opacity: number;
  filter: string | undefined;
}

// Rest state per edge type
const REST: Record<EdgeType, EdgeVisuals> = {
  direct:   { stroke: blueprint.edgeDirect,   strokeWidth: 1.0, opacity: 0.40, filter: undefined },
  computed: { stroke: blueprint.edgeComputed,  strokeWidth: 1.5, opacity: 0.75, filter: undefined },
  ttu:      { stroke: blueprint.edgeTtu,       strokeWidth: 1.5, opacity: 0.55, filter: undefined },
};

// Active (hovered-connected / selected / traced) state
const ACTIVE: Record<EdgeType, EdgeVisuals> = {
  direct:   { stroke: blueprint.edgeDirectActive,   strokeWidth: 1.5, opacity: 0.85, filter: undefined },
  computed: { stroke: blueprint.edgeComputedActive,  strokeWidth: 2.0, opacity: 1.0,  filter: undefined },
  ttu:      { stroke: blueprint.edgeTtuActive,       strokeWidth: 2.0, opacity: 1.0,  filter: 'drop-shadow(0 0 3px rgba(56, 189, 248, 0.4))' },
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
  const selectedEdgeId = useViewerStore((s) => s.selectedEdgeId);
  const tracedEdgeIds = useViewerStore((s) => s.tracedEdgeIds);

  return useMemo(() => {
    const rest = REST[edgeType];
    const active = ACTIVE[edgeType];

    // 1. Path-trace mode takes priority
    if (tracedEdgeIds) {
      if (tracedEdgeIds.has(edgeId)) return active;
      return { ...rest, opacity: PATH_DIMMED_OPACITY, filter: undefined };
    }

    // 2. Selected edge
    if (selectedEdgeId === edgeId) return active;

    // 3. Node hover
    if (hoveredNodeId) {
      const connected = source === hoveredNodeId || target === hoveredNodeId;
      if (connected) return active;
      return { ...rest, opacity: DIMMED_OPACITY, filter: undefined };
    }

    // 4. Default rest state
    return rest;
  }, [edgeId, source, target, edgeType, hoveredNodeId, selectedEdgeId, tracedEdgeIds]);
}
