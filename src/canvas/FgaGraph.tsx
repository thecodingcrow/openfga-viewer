import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  MiniMap,
  Controls,
  useNodesState,
  useEdgesState,
  useNodesInitialized,
  useReactFlow,
  BackgroundVariant,
  PanOnScrollMode,
  type Node,
  type Edge,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useShallow } from 'zustand/react/shallow';
import { useViewerStore } from '../store/viewer-store';
import { useHoverStore } from '../store/hover-store';
import { getLayoutedElementsV2 } from '../layout/elk-layout';
import { toFlowElementsV2 } from './fgaToFlowV2';

import { CompactTypeNode } from './nodes/CompactTypeNode';
import { DimensionEdge } from './edges/DimensionEdge';

const nodeTypes = { compactType: CompactTypeNode };
const edgeTypes = { dimension: DimensionEdge };

const FgaGraphInner = () => {
  const layoutDirection = useViewerStore((s) => s.layoutDirection);
  const parseVersion = useViewerStore((s) => s.parseVersion);
  const clearHover = useHoverStore((s) => s.clearHover);
  const setReactFlowInstance = useViewerStore((s) => s.setReactFlowInstance);
  const setAnchorType = useViewerStore((s) => s.setAnchorType);
  const anchorType = useViewerStore((s) => s.anchorType);
  const dimensions = useViewerStore((s) => s.dimensions);

  const visibleTypeNames = useViewerStore(
    useShallow((s) => s.visibleTypeNames),
  );

  const visibleEdges = useViewerStore(
    useShallow((s) => s.visibleEdges),
  );

  const { nodes: flowNodes, edges: flowEdges } = useMemo(
    () => toFlowElementsV2(visibleTypeNames, visibleEdges, anchorType, dimensions),
    [visibleTypeNames, visibleEdges, anchorType, dimensions],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(flowEdges);
  const nodesInitialized = useNodesInitialized();
  const reactFlow = useReactFlow();
  const layoutDone = useRef(false);
  const [layoutReady, setLayoutReady] = useState(false);
  const prevParseVersion = useRef(parseVersion);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  // Sync flow elements when inputs change
  useEffect(() => {
    setNodes(flowNodes);
    setEdges(flowEdges);
    layoutDone.current = false;
    setLayoutReady(false); // eslint-disable-line react-hooks/set-state-in-effect
  }, [flowNodes, flowEdges, setNodes, setEdges]);

  // Run ELK layout once nodes are initialized
  useEffect(() => {
    if (!nodesInitialized || nodesRef.current.length === 0 || layoutDone.current) return;
    let cancelled = false;
    getLayoutedElementsV2(
      nodesRef.current,
      edgesRef.current,
      layoutDirection,
    ).then(({ nodes: laid, edges: laidEdges }) => {
      if (cancelled) return;
      setNodes(laid);
      setEdges(laidEdges);
      layoutDone.current = true;
      setLayoutReady(true);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          reactFlow.fitView({ duration: 200, minZoom: 0.5, maxZoom: 1.2, padding: 0.08 });
        });
      });
    });
    return () => {
      cancelled = true;
    };
  }, [nodesInitialized, layoutDirection, setNodes, setEdges, reactFlow]);

  // Reset layout when parseVersion changes
  useEffect(() => {
    if (parseVersion !== prevParseVersion.current) {
      prevParseVersion.current = parseVersion;
      layoutDone.current = false;
    }
  }, [parseVersion]);

  // Reset layout when direction changes
  useEffect(() => {
    layoutDone.current = false;
  }, [layoutDirection]);

  // ─── Callbacks ─────────────────────────────────────────────────────────────

  const onInit = useCallback(
    (instance: ReactFlowInstance<Node, Edge>) => setReactFlowInstance(instance),
    [setReactFlowInstance],
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setAnchorType(node.id);
    },
    [setAnchorType],
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
        onNodeClick={onNodeClick}
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
        <MiniMap
          style={{ background: 'rgba(17, 17, 17, 0.95)', border: '1px solid var(--color-border)' }}
          maskColor="rgba(17, 17, 17, 0.7)"
          nodeColor={() => '#333333'}
          pannable
          zoomable
        />
        <Controls
          style={{ background: 'rgba(17, 17, 17, 0.95)', border: '1px solid var(--color-border)' }}
          showInteractive={false}
        />
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
