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
import { getLayoutedElements } from '../layout/elk-layout';
import { toFlowElements } from './fgaToFlow';
import { setIsTransitioning } from './transition-state';

import { TypeCardNode } from './nodes/TypeCardNode';
import { DimensionEdge } from './edges/DimensionEdge';

const nodeTypes = { typeCard: TypeCardNode };
const edgeTypes = { dimension: DimensionEdge };

/** Phase 1 fade-out duration (ms) */
const FADE_OUT_MS = 150;
/** Extra buffer after fade-out before Phase 2 starts */
const PHASE2_DELAY_MS = 180;
/** Time to wait for CSS transform animation before fitView */
const POSITION_ANIM_MS = 350;

const FgaGraphInner = () => {
  const layoutDirection = useViewerStore((s) => s.layoutDirection);
  const parseVersion = useViewerStore((s) => s.parseVersion);
  const selectNode = useViewerStore((s) => s.selectNode);
  const selectEdge = useViewerStore((s) => s.selectEdge);
  const clearHover = useHoverStore((s) => s.clearHover);
  const focusMode = useViewerStore((s) => s.focusMode);
  const setFocusMode = useViewerStore((s) => s.setFocusMode);
  const setReactFlowInstance = useViewerStore((s) => s.setReactFlowInstance);

  // Navigation state
  const navStackLength = useViewerStore((s) => s.navigationStack.length);
  const collapsedCards = useViewerStore((s) => s.collapsedCards);

  const { nodes: visibleNodes, edges: visibleEdges } = useViewerStore(
    useShallow((s) => s.getVisibleGraph()),
  );

  const { nodes: flowNodes, edges: flowEdges } = useMemo(
    () => toFlowElements({ nodes: visibleNodes, edges: visibleEdges }),
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

  // Transition guard: incremented on each navigation to abort stale transitions
  const transitionIdRef = useRef(0);
  // Previous navStackLength to detect changes
  const prevNavStackLengthRef = useRef(navStackLength);
  // Previous collapsedCards size to detect collapse changes
  const prevCollapsedSizeRef = useRef(collapsedCards.size);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  useEffect(() => {
    console.log('[setNodes:initial] count:', initialNodes.length, initialNodes.map(n => n.id));
    setNodes(initialNodes);
    setEdges(initialEdges);
    layoutDone.current = false;
    setLayoutReady(false);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  useEffect(() => {
    if (!nodesInitialized || nodesRef.current.length === 0 || layoutDone.current) return;
    let cancelled = false;
    console.log('[setNodes:layout-start] nodesRef count:', nodesRef.current.length, nodesRef.current.map((n: Node) => n.id));
    getLayoutedElements(
      nodesRef.current,
      edgesRef.current,
      layoutDirection,
    ).then(({ nodes: laid, edges: laidEdges }) => {
      if (cancelled) return;
      console.log('[setNodes:layout-done] count:', laid.length, laid.map(n => n.id));
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

  useEffect(() => {
    if (parseVersion !== prevParseVersion.current) {
      prevParseVersion.current = parseVersion;
      layoutDone.current = false;
    }
  }, [parseVersion]);

  useEffect(() => {
    layoutDone.current = false;
  }, [layoutDirection]);

  // ── Two-phase subgraph transition ──────────────────────────────────────────

  useEffect(() => {
    // Only run when navStackLength actually changes
    if (navStackLength === prevNavStackLengthRef.current) return;
    const wasInSubgraph = prevNavStackLengthRef.current > 0;
    prevNavStackLengthRef.current = navStackLength;

    // Increment transition ID to guard against rapid navigation
    transitionIdRef.current += 1;
    const transitionId = transitionIdRef.current;
    setIsTransitioning(true);

    if (navStackLength === 0) {
      // ── Returning to overview ─────────────────────────────────────────────
      // Only animate if we were previously in a subgraph
      if (wasInSubgraph) {
        // Reset layout to rebuild full graph from scratch
        layoutDone.current = false;
        setLayoutReady(false);

        // Restore all nodes from flow data (the initialNodes/initialEdges
        // effect will trigger with the full set from getVisibleGraph)
        console.log('[setNodes:overview-restore] count:', initialNodes.length);
        setNodes(initialNodes);
        setEdges(initialEdges);

        // The existing layout effect will pick up layoutDone.current = false
        // and re-layout. After that, fitView runs.
        setTimeout(() => {
          if (transitionIdRef.current !== transitionId) return;
          setIsTransitioning(false);
        }, PHASE2_DELAY_MS + POSITION_ANIM_MS + 200);
      } else {
        setIsTransitioning(false);
      }
      return;
    }

    // ── Navigating into subgraph ──────────────────────────────────────────
    const state = useViewerStore.getState();
    const currentFrame = state.navigationStack[state.navigationStack.length - 1];
    if (!currentFrame) {
      setIsTransitioning(false);
      return;
    }
    const visibleTypeIds = currentFrame.visibleTypeIds;

    // DEBUG: trace transition
    console.log('[transition] Phase 1 fade. visibleTypeIds:', [...visibleTypeIds]);
    console.log('[transition] prevNodes:', nodesRef.current.map(n => n.id));
    console.log('[transition] Phase 1 visibility:', nodesRef.current.map(n => `${n.id}:${visibleTypeIds.has(n.id)}`));

    // Phase 1: Fade out non-visible nodes and their edges
    setNodes((prevNodes) =>
      prevNodes.map((n) => ({
        ...n,
        style: {
          ...n.style,
          opacity: visibleTypeIds.has(n.id) ? 1 : 0,
          transition: `opacity ${FADE_OUT_MS}ms ease-out`,
        },
      })),
    );

    setEdges((prevEdges) =>
      prevEdges.map((e) => ({
        ...e,
        style: {
          ...e.style,
          opacity:
            visibleTypeIds.has(e.source) && visibleTypeIds.has(e.target) ? 1 : 0,
          transition: `opacity ${FADE_OUT_MS}ms ease-out`,
        },
      })),
    );

    // Phase 2: After fade-out completes, filter and re-layout
    const phase2Timer = setTimeout(() => {
      if (transitionIdRef.current !== transitionId) return;

      // Filter to only visible nodes/edges
      console.log('[transition] Phase 2 filter. nodesRef:', nodesRef.current.map(n => n.id));
      const filteredNodes = nodesRef.current
        .filter((n) => visibleTypeIds.has(n.id))
        .map((n) => ({
          ...n,
          style: { ...n.style, opacity: 1, transition: undefined },
        }));

      const filteredEdges = edgesRef.current
        .filter(
          (e) => visibleTypeIds.has(e.source) && visibleTypeIds.has(e.target),
        )
        .map((e) => ({
          ...e,
          style: { ...e.style, opacity: 1, transition: undefined },
          // Clear elkRoute so layout computes fresh routes
          data: { ...e.data, elkRoute: undefined },
        }));

      console.log('[transition] Phase 2 filtered:', filteredNodes.map(n => n.id), 'edges:', filteredEdges.length);

      // Run ELK layout on the subset
      getLayoutedElements(filteredNodes, filteredEdges, layoutDirection).then(
        ({ nodes: laid, edges: laidEdges }) => {
          if (transitionIdRef.current !== transitionId) {
            console.log('[setNodes:phase2-elk] STALE, skipped. transitionId:', transitionId, 'current:', transitionIdRef.current);
            return;
          }
          console.log('[setNodes:phase2-elk] count:', laid.length, laid.map(n => n.id), 'transitionId:', transitionId);
          setNodes(laid);
          setEdges(laidEdges);

          // After CSS transform animation completes, fitView
          setTimeout(() => {
            if (transitionIdRef.current !== transitionId) return;
            reactFlow.fitView({ duration: 200, padding: 0.08 });
            setTimeout(() => {
              if (transitionIdRef.current !== transitionId) return;
              setIsTransitioning(false);
            }, 220);
          }, POSITION_ANIM_MS);
        },
      );
    }, PHASE2_DELAY_MS);

    return () => {
      clearTimeout(phase2Timer);
    };
    // navStackLength is the key trigger; layoutDirection for re-layout params
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navStackLength]);

  // ── Card collapse re-layout ────────────────────────────────────────────────

  useEffect(() => {
    const currentSize = collapsedCards.size;
    if (currentSize === prevCollapsedSizeRef.current) return;
    prevCollapsedSizeRef.current = currentSize;

    // Wait one rAF for React to render the collapsed/expanded card,
    // then trigger ELK re-layout with updated dimensions
    const rafId = requestAnimationFrame(() => {
      layoutDone.current = false;
      // Force re-layout by resetting the flag; the existing layout effect
      // won't run because nodesInitialized is already true and nodes haven't
      // changed. We need to trigger layout directly.
      const currentNodes = nodesRef.current;
      const currentEdges = edgesRef.current;

      getLayoutedElements(currentNodes, currentEdges, layoutDirection).then(
        ({ nodes: laid, edges: laidEdges }) => {
          console.log('[setNodes:collapse-layout] count:', laid.length, laid.map(n => n.id));
          setNodes(laid);
          setEdges(laidEdges);
          layoutDone.current = true;
          setTimeout(() => {
            reactFlow.fitView({ duration: 200, padding: 0.08 });
          }, POSITION_ANIM_MS);
        },
      );
    });

    return () => {
      cancelAnimationFrame(rafId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsedCards]);

  // ─── Callbacks ─────────────────────────────────────────────────────────────

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

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      selectEdge(edge.id);
    },
    [selectEdge],
  );

  const onPaneClick = useCallback(() => {
    selectEdge(null);
    clearHover();
    if (focusMode === 'neighborhood') setFocusMode('overview');
  }, [selectEdge, clearHover, focusMode, setFocusMode]);

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
        onEdgeClick={onEdgeClick}
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
        <Background variant={BackgroundVariant.Dots} color="#1e3a5c" gap={24} size={1} />
        <MiniMap
          style={{ background: 'rgba(15, 23, 41, 0.95)', border: '1px solid #2a3a5c' }}
          maskColor="rgba(15, 23, 41, 0.7)"
          nodeColor={() => '#334155'}
          pannable
          zoomable
        />
        <Controls
          style={{ background: 'rgba(15, 23, 41, 0.95)', border: '1px solid #2a3a5c' }}
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
