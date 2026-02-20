import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
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
import { getLayoutedElements } from '../layout/elk-layout';
import { toFlowElements } from './fgaToFlow';

import { TypeNode } from './nodes/TypeNode';
import { RelationNode } from './nodes/RelationNode';
import { PermissionNode } from './nodes/PermissionNode';
import { DirectEdge } from './edges/DirectEdge';
import { ComputedEdge } from './edges/ComputedEdge';
import { TtuEdge } from './edges/TtuEdge';

const nodeTypes = {
  type: TypeNode,
  relation: RelationNode,
  permission: PermissionNode,
};

const edgeTypes = {
  direct: DirectEdge,
  computed: ComputedEdge,
  ttu: TtuEdge,
};

const FgaGraphInner = () => {
  const layoutDirection = useViewerStore((s) => s.layoutDirection);
  const parseVersion = useViewerStore((s) => s.parseVersion);
  const selectNode = useViewerStore((s) => s.selectNode);
  const setHoveredNode = useHoverStore((s) => s.setHoveredNode);
  const focusMode = useViewerStore((s) => s.focusMode);
  const setFocusMode = useViewerStore((s) => s.setFocusMode);
  const setReactFlowInstance = useViewerStore((s) => s.setReactFlowInstance);

  const { nodes: visibleNodes, edges: visibleEdges } = useViewerStore(
    useShallow((s) => s.getVisibleGraph()),
  );

  const { nodes: flowNodes, edges: flowEdges } = useMemo(
    () => toFlowElements(visibleNodes, visibleEdges),
    [visibleNodes, visibleEdges],
  );

  const initialNodes = useMemo((): Node[] => flowNodes, [flowNodes]);
  const initialEdges = useMemo((): Edge[] => flowEdges, [flowEdges]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);
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

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    layoutDone.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: reset layout-ready flag when data changes
    setLayoutReady(false);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  useEffect(() => {
    if (!nodesInitialized || nodesRef.current.length === 0 || layoutDone.current) return;
    let cancelled = false;
    getLayoutedElements(
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
          reactFlow.fitView({ duration: 200, minZoom: 0.35, padding: 0.1 });
        });
      });
    });
    return () => {
      cancelled = true;
    };
  }, [nodesInitialized, layoutDirection, setNodes, setEdges, reactFlow]);

  useEffect(() => {
    if (parseVersion !== prevParseVersion.current) {
      prevParseVersion.current = parseVersion;
      layoutDone.current = false;
    }
  }, [parseVersion]);

  useEffect(() => {
    layoutDone.current = false;
  }, [layoutDirection]);

  const onInit = useCallback(
    (instance: ReactFlowInstance<Node, Edge>) => setReactFlowInstance(instance),
    [setReactFlowInstance],
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode],
  );

  const onNodeMouseEnter = useCallback(
    (_: React.MouseEvent, node: Node) => setHoveredNode(node.id),
    [setHoveredNode],
  );

  const onNodeMouseLeave = useCallback(
    () => setHoveredNode(null),
    [setHoveredNode],
  );

  const onPaneClick = useCallback(() => {
    if (focusMode === 'neighborhood') setFocusMode('overview');
  }, [focusMode, setFocusMode]);

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
      onNodeMouseEnter={onNodeMouseEnter}
      onNodeMouseLeave={onNodeMouseLeave}
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
      <Background variant={BackgroundVariant.Dots} color="#334155" gap={20} size={1.5} />
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
