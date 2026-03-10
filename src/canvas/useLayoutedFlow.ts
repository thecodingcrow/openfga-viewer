import { useEffect, useRef, useState } from 'react';
import {
  useNodesState,
  useEdgesState,
  useNodesInitialized,
  useReactFlow,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
} from '@xyflow/react';
import type { Dispatch, SetStateAction } from 'react';
import type { LayoutDirection } from '../types';
import { getLayoutedElementsV2 } from '../layout/elk-layout';

type LayoutStatus = 'idle' | 'syncing' | 'measuring' | 'layouting' | 'ready';

interface LayoutedFlowResult {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  layoutReady: boolean;
}

export function useLayoutedFlow(
  flowNodes: Node[],
  flowEdges: Edge[],
  layoutDirection: LayoutDirection,
): LayoutedFlowResult {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(flowEdges);
  const [status, setStatus] = useState<LayoutStatus>('idle');
  const nodesInitialized = useNodesInitialized();
  const reactFlow = useReactFlow();

  // Capture measured nodes/edges for the async ELK call
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);

  // ── Step 1: Sync new flow elements into React Flow ─────────────
  useEffect(() => {
    setNodes(flowNodes);
    setEdges(flowEdges);
    nodesRef.current = flowNodes;
    edgesRef.current = flowEdges;
    setStatus('syncing'); // eslint-disable-line react-hooks/set-state-in-effect
  }, [flowNodes, flowEdges, setNodes, setEdges]);

  // Keep refs in sync with measured nodes/edges
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  // ── Step 2: Wait for React Flow to measure nodes ───────────────
  useEffect(() => {
    if (status === 'syncing' && nodesInitialized) {
      setStatus('measuring'); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [status, nodesInitialized]);

  // ── Step 3: Run async ELK layout ──────────────────────────────
  useEffect(() => {
    if (status !== 'measuring') return;
    setStatus('layouting'); // eslint-disable-line react-hooks/set-state-in-effect
    let cancelled = false;

    getLayoutedElementsV2(
      nodesRef.current,
      edgesRef.current,
      layoutDirection,
    ).then(({ nodes: laid, edges: laidEdges }) => {
      if (cancelled) return;
      setNodes(laid);
      setEdges(laidEdges);
      setStatus('ready');
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          reactFlow.fitView({ duration: 200, minZoom: 0.5, maxZoom: 1.2, padding: 0.08 });
        });
      });
    });

    return () => {
      cancelled = true;
    };
  }, [status, layoutDirection, setNodes, setEdges, reactFlow]);

  // ── Step 4: Reset on direction change ──────────────────────────
  const prevDirection = useRef(layoutDirection);
  useEffect(() => {
    if (layoutDirection !== prevDirection.current) {
      prevDirection.current = layoutDirection;
      setStatus('syncing'); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [layoutDirection]);

  return { nodes, edges, onNodesChange, onEdgesChange, setEdges, layoutReady: status === 'ready' };
}
