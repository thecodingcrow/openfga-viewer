import { useEffect, useRef, useState } from 'react';
import {
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
} from '@xyflow/react';
import type { Dispatch, SetStateAction } from 'react';
import type { LayoutDirection } from '../types';
import { getLayoutedElementsV2 } from '../layout/elk-layout';

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
  const [layoutReady, setLayoutReady] = useState(false);
  const reactFlow = useReactFlow();
  const layoutId = useRef(0);

  // Sync + layout whenever flow elements or direction change
  useEffect(() => {
    const id = ++layoutId.current;
    setLayoutReady(false); // eslint-disable-line react-hooks/set-state-in-effect
    setNodes(flowNodes);
    setEdges(flowEdges);

    // Give React Flow one frame to render/measure nodes, then run ELK
    const raf = requestAnimationFrame(() => {
      if (id !== layoutId.current) return;

      getLayoutedElementsV2(flowNodes, flowEdges, layoutDirection)
        .then(({ nodes: laid, edges: laidEdges }) => {
          if (id !== layoutId.current) return;
          setNodes(laid);
          setEdges(laidEdges);
          setLayoutReady(true);
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (id !== layoutId.current) return;
              reactFlow.fitView({ duration: 200, minZoom: 0.5, maxZoom: 1.2, padding: 0.08 });
            });
          });
        })
        .catch(() => {
          if (id !== layoutId.current) return;
          setLayoutReady(true);
        });
    });

    return () => {
      cancelAnimationFrame(raf);
    };
  }, [flowNodes, flowEdges, layoutDirection, setNodes, setEdges, reactFlow]);

  return { nodes, edges, onNodesChange, onEdgesChange, setEdges, layoutReady };
}
