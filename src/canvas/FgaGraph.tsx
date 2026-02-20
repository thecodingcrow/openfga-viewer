import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useNodesInitialized,
  useReactFlow,
  BackgroundVariant,
  type Node,
  type Edge,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useViewerStore } from '../store/viewer-store';
import { getTypeColor } from '../theme/colors';
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

function miniMapNodeColor(node: { data?: Record<string, unknown> }): string {
  const typeName = (node.data?.typeName as string) ?? '';
  return getTypeColor(typeName);
}

const FgaGraphInner = () => {
  const layoutDirection = useViewerStore((s) => s.layoutDirection);
  const parseVersion = useViewerStore((s) => s.parseVersion);
  const focusMode = useViewerStore((s) => s.focusMode);
  const tracedNodeIds = useViewerStore((s) => s.tracedNodeIds);
  const tracedEdgeIds = useViewerStore((s) => s.tracedEdgeIds);
  const selectNode = useViewerStore((s) => s.selectNode);
  const selectEdge = useViewerStore((s) => s.selectEdge);
  const setHoveredNode = useViewerStore((s) => s.setHoveredNode);
  const setFocusMode = useViewerStore((s) => s.setFocusMode);
  const setReactFlowInstance = useViewerStore((s) => s.setReactFlowInstance);

  const visibleNodes = useViewerStore((s) => s.getVisibleGraph().nodes);
  const visibleEdges = useViewerStore((s) => s.getVisibleGraph().edges);

  const isPathMode = focusMode === 'path' && tracedNodeIds !== null;

  const initialNodes = useMemo((): Node[] => {
    const { nodes: flowNodes, edges: flowEdges } = toFlowElements(visibleNodes, visibleEdges);
    void flowEdges;
    return flowNodes.map((n) => ({
      ...n,
      style: isPathMode && !tracedNodeIds!.has(n.id) ? { opacity: 0.25 } : undefined,
    }));
  }, [visibleNodes, visibleEdges, isPathMode, tracedNodeIds]);

  const initialEdges = useMemo((): Edge[] => {
    const { edges: flowEdges } = toFlowElements(visibleNodes, visibleEdges);
    return flowEdges.map((e) => ({
      ...e,
      style: {
        ...(e.style ?? {}),
        ...(isPathMode && !tracedEdgeIds!.has(e.id) ? { opacity: 0.1 } : {}),
      },
    }));
  }, [visibleNodes, visibleEdges, isPathMode, tracedEdgeIds]);

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
        reactFlow.fitView({ duration: 200, minZoom: 0.35, padding: 0.1 });
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
    (_: React.MouseEvent, node: Node) => selectNode(node.id),
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

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => selectEdge(edge.id),
    [selectEdge],
  );

  const onPaneClick = useCallback(() => {
    selectEdge(null);
    if (focusMode === 'neighborhood') setFocusMode('overview');
  }, [selectEdge, focusMode, setFocusMode]);

  const onNodeDragStart = useCallback(
    (_event: React.MouseEvent, _node: Node, draggedNodes: Node[]) => {
      const draggedIds = new Set(draggedNodes.map((n) => n.id));
      setEdges((eds) =>
        eds.map((e) => {
          if (!e.data?.elkRoute) return e;
          if (!draggedIds.has(e.source) && !draggedIds.has(e.target)) return e;
          const { elkRoute, ...rest } = e.data;
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
      onEdgeClick={onEdgeClick}
      onPaneClick={onPaneClick}
      onNodeDragStart={onNodeDragStart}
      fitView
      minZoom={0.2}
      maxZoom={2}
      colorMode="dark"
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Dots} color="#334155" gap={20} size={1.5} />
      <Controls className="bg-slate-800/80! border-slate-600! rounded-lg!" />
      <MiniMap
        nodeColor={miniMapNodeColor}
        maskColor="rgba(15, 23, 42, 0.8)"
        className="bg-slate-900/90! rounded-lg! border-slate-600!"
      />
    </ReactFlow>
    </div>
  );
};

const FgaGraph = () => {
  const nodes = useViewerStore((s) => s.getVisibleGraph().nodes);
  if (nodes.length === 0) return null;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <FgaGraphInner />
    </div>
  );
};

export default FgaGraph;
