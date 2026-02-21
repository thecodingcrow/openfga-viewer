import { useMemo } from 'react';
import { useHoverStore } from '../../store/hover-store';
import { useViewerStore } from '../../store/viewer-store';

interface NodeVisualState {
  /** Whether this node is dimmed (non-focal during hover/trace) */
  dimmed: boolean;
}

export function useNodeInteraction(nodeId: string): NodeVisualState {
  const hoveredNodeId = useHoverStore((s) => s.hoveredNodeId);
  const focalNodeIds = useHoverStore((s) => s.focalNodeIds);
  const tracedNodeIds = useViewerStore((s) => s.tracedNodeIds);

  return useMemo(() => {
    // Path-trace mode: dim non-traced nodes
    if (tracedNodeIds) {
      return { dimmed: !tracedNodeIds.has(nodeId) };
    }

    // Hover mode: dim nodes not in focal set (TTU + 1-hop neighbors)
    if (hoveredNodeId) {
      return { dimmed: !focalNodeIds.has(nodeId) };
    }

    // Default: not dimmed
    return { dimmed: false };
  }, [nodeId, hoveredNodeId, focalNodeIds, tracedNodeIds]);
}
