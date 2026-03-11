import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  PanOnScrollMode,
  type Node,
  type ReactFlowInstance,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useShallow } from 'zustand/react/shallow';
import { useViewerStore } from '../store/viewer-store';
import { useHoverStore } from '../store/hover-store';
import { toFlowElementsV2 } from './fgaToFlowV2';
import { anchorToFlowElements } from './anchorToFlow';
import { useLayoutedFlow } from './useLayoutedFlow';

import { CompactTypeNode } from './nodes/CompactTypeNode';
import { ExploreNode } from './nodes/ExploreNode';
import { DimensionEdge } from './edges/DimensionEdge';
import { PathBreadcrumb } from './PathBreadcrumb';

const nodeTypes = { compactType: CompactTypeNode, explore: ExploreNode };
const edgeTypes = { dimension: DimensionEdge };

const FgaGraphInner = () => {
  const layoutDirection = useViewerStore((s) => s.layoutDirection);
  const clearHover = useHoverStore((s) => s.clearHover);
  const setReactFlowInstance = useViewerStore((s) => s.setReactFlowInstance);
  const anchor = useViewerStore((s) => s.anchor);
  const anchorType = useViewerStore((s) => s.anchorType);
  const dimensions = useViewerStore((s) => s.dimensions);

  const visibleTypeNames = useViewerStore(
    useShallow((s) => s.visibleTypeNames),
  );

  const visibleEdges = useViewerStore(
    useShallow((s) => s.visibleEdges),
  );

  // When anchor is set, render the exploration graph; otherwise compact overview
  const { nodes: flowNodes, edges: flowEdges } = useMemo(() => {
    if (anchor) {
      return anchorToFlowElements(anchor);
    }
    return toFlowElementsV2(visibleTypeNames, visibleEdges, anchorType, dimensions);
  }, [anchor, visibleTypeNames, visibleEdges, anchorType, dimensions]);

  const { nodes, edges, onNodesChange, onEdgesChange, setEdges, layoutReady } =
    useLayoutedFlow(flowNodes, flowEdges, layoutDirection);

  // ─── Callbacks ─────────────────────────────────────────────────

  const onInit = useCallback(
    (instance: ReactFlowInstance<Node, Edge>) => setReactFlowInstance(instance),
    [setReactFlowInstance],
  );

  const onPaneClick = useCallback(() => {
    clearHover();
  }, [clearHover]);

  const onNodeDragStart = useCallback(
    (_event: React.MouseEvent, _node: Node, draggedNodes: Node[]) => {
      const draggedIds = new Set(draggedNodes.map((n) => n.id));
      setEdges((eds) =>
        eds.map((e) => {
          if (!e.data?.elkRoute) return e;
          if (!draggedIds.has(e.source) && !draggedIds.has(e.target)) return e;
          const { elkRoute: _, ...rest } = e.data;
          void _;
          return { ...e, data: rest };
        }),
      );
    },
    [setEdges],
  );

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        opacity: layoutReady ? 1 : 0,
        transition: 'opacity 150ms ease-out',
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onInit={onInit}
        onPaneClick={onPaneClick}
        onNodeDragStart={onNodeDragStart}
        fitView
        minZoom={0.2}
        maxZoom={2}
        panOnScroll
        panOnScrollMode={PanOnScrollMode.Free}
        zoomOnPinch
        zoomOnScroll={false}
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} color="#222222" gap={24} size={1} />
        {/* MiniMap removed — sidebar is the primary navigation tool */}
        <Controls
          style={{ background: 'rgba(17, 17, 17, 0.95)', border: '1px solid var(--color-border)' }}
          showInteractive={false}
        />
        <PathBreadcrumb />
      </ReactFlow>
    </div>
  );
};

const FgaGraph = () => {
  const hasNodes = useViewerStore((s) => s.nodes.length > 0);
  if (!hasNodes) return null;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <FgaGraphInner />
    </div>
  );
};

export default FgaGraph;
