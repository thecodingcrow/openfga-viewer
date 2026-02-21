# Architecture Research

**Domain:** Compound graph visualization with hierarchical layout and edge routing
**Researched:** 2026-02-21
**Confidence:** HIGH (based on existing codebase analysis + ELK official docs + React Flow docs)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Pipeline Orchestration                         │
│                          (FgaGraph.tsx)                                  │
├──────────┬───────────┬──────────────┬──────────────┬────────────────────┤
│          │           │              │              │                    │
│  ┌───────┴───────┐  │  ┌───────────┴──────────┐  │  ┌─────────────┐   │
│  │   Conversion  │  │  │     Layout Engine     │  │  │  Rendering  │   │
│  │  fgaToFlow.ts │  │  │    elk-layout.ts      │  │  │  Nodes +    │   │
│  │               │  │  │                       │  │  │  Edges      │   │
│  │  Domain →     │  │  │  Pass 1: Hierarchical │  │  │             │   │
│  │  React Flow   │  │  │  Pass 2: Band grid    │  │  │  ELK path   │   │
│  └───────────────┘  │  │  Pass 3: Root repack  │  │  │  or fallback│   │
│                     │  └───────────────────────┘  │  └─────────────┘   │
├─────────────────────┴─────────────────────────────┴────────────────────┤
│                          State Layer                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │ Viewer Store  │  │ Hover Store  │  │ Layout Cache │                  │
│  │ (Zustand)     │  │ (Zustand)    │  │ (Module LRU) │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
├─────────────────────────────────────────────────────────────────────────┤
│                          Domain Layer                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │ Parser        │  │ Graph Algs   │  │ Theme        │                  │
│  │ (DSL → Model) │  │ (Traversal)  │  │ (Colors)     │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| **Parser** (`src/parser/`) | FGA DSL text to `AuthorizationGraph` | Store (via `parse()` action) |
| **Graph Algorithms** (`src/graph/`) | Filtering, neighborhood, path finding, TTU expansion | Store (derived computations) |
| **Conversion** (`src/canvas/fgaToFlow.ts`) | Domain `AuthorizationNode/Edge` to React Flow `Node/Edge` | Layout Engine, Canvas |
| **Layout Engine** (`src/layout/elk-layout.ts`) | Position nodes, route edges via ELK | Conversion (input), Canvas (output) |
| **Edge Path Math** (`src/layout/elk-path.ts`) | SVG path generation from ELK polylines, endpoint trimming | Edge components |
| **Canvas Orchestrator** (`src/canvas/FgaGraph.tsx`) | Pipeline coordination: convert -> layout -> render | All pipeline stages |
| **Node Components** (`src/canvas/nodes/`) | Visual rendering of type/relation/permission nodes | Hover Store, Theme |
| **Edge Components** (`src/canvas/edges/`) | Visual rendering of edges with ELK route or fallback | Layout (ElkRoute), Hover Store |
| **Viewer Store** (`src/store/viewer-store.ts`) | Central state: source, graph, filters, selection, UI | Everything |
| **Hover Store** (`src/store/hover-store.ts`) | Isolated hover state to avoid main store churn | Node/Edge interaction hooks |

## Recommended Architecture (Revised Layout Pipeline)

### The Problem With the Current 3-Pass System

The existing layout pipeline runs three sequential ELK passes:

1. **Pass 1**: Hierarchical ELK with `INCLUDE_CHILDREN` -- lays out everything in one run
2. **Pass 2**: Grid redistribution -- manually repositions children in oversized compounds
3. **Pass 3**: Root repack -- another ELK pass to fix compound positions after resizing

This causes several problems:
- **Pass 2 invalidates all ELK edge routes** for redistributed compounds. Edges fall back to React Flow's generic `getSmoothStepPath()`, which knows nothing about compound boundaries and routes edges through other nodes.
- **Pass 3 moves compounds** but cannot re-route edges (ELK computed them in Pass 1 with different positions).
- The grid redistribution destroys ELK's layering intelligence -- children get uniform grid cells regardless of their actual dependency ordering.
- Cross-compound edges from Pass 1 become misaligned after Pass 3 moves compounds.

### Proposed Architecture: Two-Phase Layout

Replace the 3-pass system with a clean 2-phase approach:

```
Phase 1: Internal Layout (per compound)
  For each compound type node:
    Run ELK layered on its children (relations + permissions)
    with band constraints (relations top, permissions bottom)
    → produces positioned children + internal edge routes
    → compound gets precise width/height from this pass

Phase 2: Global Layout (root level)
  Run ELK layered on:
    - Compound nodes (with known sizes from Phase 1)
    - Leaf type nodes
    - Cross-compound edges (collapsed to compound-to-compound)
  → produces compound positions
  → cross-compound edge routes computed at this level

Assembly:
  - Internal child positions = Phase 1 positions (relative to parent)
  - Internal edge routes = Phase 1 routes (valid, never invalidated)
  - Compound positions = Phase 2 positions
  - Cross-compound edge routes = Phase 2 routes (valid at root level)
  - Translate internal routes to absolute coords for rendering
```

**Why this is better:** Each ELK pass is authoritative for its scope. Internal routes are never invalidated because internal positions never change after Phase 1. Cross-compound routes are computed with final compound positions, so they are always accurate.

### Component Boundaries

| Component | Input | Output | Depends On |
|-----------|-------|--------|------------|
| **Band Classifier** | `Node[]` (children of compound) | `{ relations: Node[], permissions: Node[] }` | Node type metadata |
| **Internal Layout** | Compound children + internal edges | Positioned children + internal ElkRoutes + compound dimensions | ELK, Band Classifier |
| **Global Layout** | Compound nodes (with sizes), leaf nodes, cross-compound edges | Positioned compounds + cross-compound ElkRoutes | ELK |
| **Route Assembly** | Internal routes + global routes + positions | Final `ElkRoute` per edge (absolute coordinates) | Both layout phases |
| **Edge Classifier** | All edges + parent membership | `{ internal: Map<compoundId, Edge[]>, cross: Edge[] }` | fgaToFlow parent info |

### Data Flow

```
Domain Graph (from store)
    │
    ▼
toFlowElements()
    │  Produces: Flow Nodes + Flow Edges
    │  Classifies: compound parents, child membership
    │  Filters: TTU edges removed
    │
    ├──── classifyEdges(edges, childParentMap)
    │         │
    │         ├── internalEdges: Map<compoundId, Edge[]>
    │         └── crossEdges: Edge[]
    │
    ▼
Phase 1: Per-Compound Internal Layout
    │  For each compound with children:
    │    ELK layered pass on children + internal edges
    │    Band constraints: relations FIRST_SEPARATE, permissions after
    │    → child positions (relative to compound)
    │    → internal edge routes (relative to compound)
    │    → compound dimensions (width, height)
    │
    ▼
Phase 2: Global Root Layout
    │  ELK layered pass on:
    │    compound nodes (with Phase 1 dimensions)
    │    + leaf type nodes
    │    + collapsed cross-compound edges
    │  → compound/leaf positions (absolute)
    │  → cross-compound edge routes (absolute)
    │
    ▼
Route Assembly
    │  For each edge:
    │    if internal → translate Phase 1 route by compound position
    │    if cross-compound → use Phase 2 route directly
    │    if no route → flag for fallback path generation
    │
    ▼
React Flow Render
    │  Nodes with positions + parentId
    │  Edges with elkRoute data
    │  Edge components: prefer elkRoute, fall back to getSmoothStepPath
```

## Architectural Patterns

### Pattern 1: Bottom-Up Compound Layout

**What:** Lay out leaf contents first, then use resulting dimensions for parent layout.
**When to use:** Any time compound nodes contain children whose arrangement determines the parent's size.
**Trade-offs:** Requires two ELK passes (one per scope level) but each pass produces stable, non-invalidated results.

**Example:**
```typescript
// Phase 1: Internal layouts produce compound sizes
const compoundSizes = new Map<string, { width: number; height: number }>();
const internalRoutes = new Map<string, Map<string, ElkRoute>>();

for (const [compoundId, children] of compoundChildrenMap) {
  const result = await elk.layout(buildInternalGraph(compoundId, children, internalEdges));
  compoundSizes.set(compoundId, {
    width: result.width ?? 0,
    height: result.height ?? 0,
  });
  internalRoutes.set(compoundId, extractRoutes(result));
}

// Phase 2: Global layout uses known sizes
const globalGraph = buildGlobalGraph(compounds, compoundSizes, leafNodes, crossEdges);
const globalResult = await elk.layout(globalGraph);
```

### Pattern 2: Edge Classification by Scope

**What:** Classify every edge as "internal to compound X" or "cross-compound" before layout. Route each class in the appropriate layout phase.
**When to use:** When compound nodes have children and edges exist both within and across compound boundaries.
**Trade-offs:** Requires pre-classification pass, but eliminates edge route invalidation.

**Example:**
```typescript
interface ClassifiedEdges {
  internal: Map<string, Edge[]>;  // compoundId → edges within it
  cross: Edge[];                   // edges between different compounds
}

function classifyEdges(
  edges: Edge[],
  childParentMap: Map<string, string>,
): ClassifiedEdges {
  const internal = new Map<string, Edge[]>();
  const cross: Edge[] = [];

  for (const edge of edges) {
    const srcParent = childParentMap.get(edge.source);
    const tgtParent = childParentMap.get(edge.target);

    if (srcParent && srcParent === tgtParent) {
      const list = internal.get(srcParent) ?? [];
      list.push(edge);
      internal.set(srcParent, list);
    } else {
      cross.push(edge);
    }
  }

  return { internal, cross };
}
```

### Pattern 3: Consolidated Edge Component

**What:** Replace three near-identical edge components (DirectEdge, ComputedEdge, TuplesetDepEdge) with a single `FgaEdge` component that reads edge type from data.
**When to use:** When edge components differ only in style (stroke color, dash pattern) but share identical routing logic.
**Trade-offs:** Less duplication, single place to update routing logic. Slightly more complex single component vs. trivially simple per-type components.

**Example:**
```typescript
const EDGE_STYLES: Record<EdgeType, { dasharray?: string }> = {
  direct: {},
  computed: { dasharray: '4 3' },
  'tupleset-dep': { dasharray: '2 4' },
};

function FgaEdgeComponent(props: EdgeProps) {
  const edgeType = props.type as EdgeType;
  const elkRoute = (props.data as { elkRoute?: ElkRoute })?.elkRoute;
  const path = elkRoute?.points?.length >= 2
    ? elkPointsToPath(elkRoute.points)
    : getSmoothStepPath(props)[0];

  const visuals = useEdgeInteraction(props.id, props.source, props.target, edgeType);
  const style = EDGE_STYLES[edgeType];

  return (
    <BaseEdge
      path={path}
      markerEnd={props.markerEnd}
      interactionWidth={20}
      style={{
        ...visuals,
        ...(style.dasharray ? { strokeDasharray: style.dasharray } : {}),
      }}
    />
  );
}
```

### Pattern 4: Band-Constrained Internal Layout

**What:** Use ELK's layer constraints to enforce band ordering within compounds -- relations in early layers, permissions in later layers.
**When to use:** When compound children have a semantic ordering (relations define access; permissions consume it).
**Trade-offs:** Respects the domain's mental model (access flows top-down from relations to permissions) without manual grid repositioning. Relies on ELK layering which handles it natively.

**Key ELK options for internal compound layout:**
```typescript
const internalLayoutOptions = {
  'elk.algorithm': 'layered',
  'elk.direction': direction === 'TB' ? 'DOWN' : 'RIGHT',
  'elk.edgeRouting': 'ORTHOGONAL',  // cleaner than POLYLINE for internal routes
  'elk.spacing.nodeNode': '18',
  'elk.layered.spacing.nodeNodeBetweenLayers': '20',
  'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
  'elk.layered.nodePlacement.favorStraightEdges': 'true',
  'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
  'elk.layered.crossingMinimization.greedySwitch.type': 'TWO_SIDED',
  'elk.padding': '[top=40, left=12, bottom=12, right=12]',
};

// Use layerConstraint on relation vs permission nodes:
// Relations: no constraint (natural ordering)
// Permissions: can use higher layerIds or let dependency edges handle it
```

## Data Flow

### Primary Layout Pipeline

```
[Store: getVisibleGraph()]
    ↓
[fgaToFlow: toFlowElements()] → Flow Nodes + Flow Edges
    ↓
[FgaGraph: nodesInitialized?]  ← React Flow measures node dimensions
    ↓
[getLayoutedElements(nodes, edges, direction)]
    ↓
    ├── Build childParentMap from compound structure
    ├── Classify edges (internal vs cross-compound)
    │
    ├── Phase 1: For each compound:
    │     ├── Separate children into relation/permission bands
    │     ├── Build internal ELK graph with band-aware layering
    │     ├── Run elk.layout() → positioned children + internal routes
    │     └── Record compound dimensions
    │
    ├── Phase 2: Global layout
    │     ├── Build root ELK graph with compound sizes from Phase 1
    │     ├── Include leaf nodes + cross-compound edges
    │     ├── Run elk.layout() → compound positions + cross-compound routes
    │     └── Record positions
    │
    └── Assembly:
          ├── Child positions → relative to parent (from Phase 1)
          ├── Compound positions → absolute (from Phase 2)
          ├── Internal routes → translate by compound position
          ├── Cross-compound routes → use directly from Phase 2
          └── Attach elkRoute to each edge's data
    ↓
[setNodes(positioned), setEdges(enriched)]
    ↓
[React Flow renders with custom node/edge components]
```

### Edge Route Lifecycle

```
Edge created in toFlowElements()
    ↓ (no route yet)
getLayoutedElements() classifies as internal or cross-compound
    ↓
Internal edge:
    Phase 1 → ELK computes route in compound-local coordinates
    Assembly → translate by compound (x, y) to get absolute route
    → elkRoute attached to edge.data

Cross-compound edge:
    Phase 2 → ELK computes route at root level with final compound positions
    → elkRoute attached to edge.data

Edge component receives props with elkRoute:
    if elkRoute.points.length >= 2 → elkPointsToPath(points) → SVG path
    else → getSmoothStepPath(props) → React Flow fallback
```

### State Update Flow

```
[User types DSL] → debounce(300ms) → parse() → store.nodes/edges updated
    → parseVersion incremented
    → FgaGraph detects change → resets layoutDone → triggers layout effect
    → getLayoutedElements(measured nodes, edges, direction)
    → setNodes/setEdges → React Flow re-renders
    → fitView after 2 animation frames
```

## ELK Configuration Recommendations

### For Internal Compound Layout (Phase 1)

| Option | Value | Rationale |
|--------|-------|-----------|
| `elk.algorithm` | `layered` | Standard for DAG-style hierarchical graphs |
| `elk.edgeRouting` | `ORTHOGONAL` | Cleaner within compounds; rectilinear paths read better in constrained spaces |
| `elk.layered.nodePlacement.strategy` | `NETWORK_SIMPLEX` | Best edge length minimization for compact internal layout |
| `elk.layered.nodePlacement.favorStraightEdges` | `true` | Reduces visual noise within compounds |
| `elk.layered.crossingMinimization.strategy` | `LAYER_SWEEP` | Default, effective for most graph sizes |
| `elk.layered.crossingMinimization.greedySwitch.type` | `TWO_SIDED` | Additional optimization pass for crossing reduction |
| `elk.spacing.nodeNode` | `18` | Tight but readable within compound |
| `elk.layered.spacing.nodeNodeBetweenLayers` | `20` | Compact layer spacing for bands |
| `elk.padding` | `top=40,left=12,bottom=12,right=12` | 40px top for compound title bar |

### For Global Root Layout (Phase 2)

| Option | Value | Rationale |
|--------|-------|-----------|
| `elk.algorithm` | `layered` | Consistent with internal |
| `elk.edgeRouting` | `POLYLINE` | Cross-compound edges benefit from polyline flexibility; orthogonal can create excessive bends around large compounds |
| `elk.layered.nodePlacement.strategy` | `NETWORK_SIMPLEX` | Minimizes total edge length between compounds |
| `elk.layered.nodePlacement.favorStraightEdges` | `true` | Keeps inter-compound edges readable |
| `elk.spacing.nodeNode` | `28` | More breathing room between compounds |
| `elk.layered.spacing.nodeNodeBetweenLayers` | `32` | Space for cross-compound edge bends |
| `elk.layered.spacing.edgeNodeBetweenLayers` | `12` | Prevent edges from hugging compound borders |

### NOT Recommended: `INCLUDE_CHILDREN` for This Use Case

The current codebase uses `elk.hierarchyHandling: INCLUDE_CHILDREN` to do everything in one pass. This is the root cause of the layout problems:

- **INCLUDE_CHILDREN** forces ELK to lay out all hierarchy levels simultaneously. This means compound sizes are determined by the same pass that positions compounds relative to each other -- a chicken-and-egg problem.
- When compounds get too wide, the manual grid redistribution (Pass 2) overrides ELK's decisions, making ELK's edge routes invalid.
- The root repack (Pass 3) then moves compounds but cannot re-route the edges.

**Use `SEPARATE_CHILDREN` (or just separate ELK calls)** to decouple internal layout from global layout. This gives each phase authority over its own scope.

## Anti-Patterns

### Anti-Pattern 1: Single-Pass Compound Layout with Post-Hoc Adjustment

**What people do:** Run one `INCLUDE_CHILDREN` pass, then manually reposition children that don't fit, then run another pass to fix parent positions.
**Why it's wrong:** The second/third passes invalidate edge routes from the first pass. You end up with a "layout patching" approach where each fix creates new problems.
**Do this instead:** Bottom-up layout: lay out children first (getting exact dimensions), then lay out parents using those known dimensions. Each pass is self-contained.

### Anti-Pattern 2: Uniform Grid for Band Children

**What people do:** Redistribute compound children into a uniform grid with `maxW x maxH` cells regardless of actual node sizes or dependency structure.
**Why it's wrong:** Destroys ELK's dependency-aware layering. A permission that depends on two relations gets placed in the same grid cell size as a standalone relation. Visual proximity no longer implies structural proximity.
**Do this instead:** Let ELK's layered algorithm handle placement within each band. If compounds get too wide, constrain the aspect ratio in ELK's options (`elk.aspectRatio`) rather than manually overriding positions.

### Anti-Pattern 3: Falling Back to getSmoothStepPath for Most Edges

**What people do:** When ELK routes are invalidated, fall back to React Flow's `getSmoothStepPath()` which knows nothing about compound boundaries.
**Why it's wrong:** `getSmoothStepPath` draws a straight-ish smooth step path from source handle to target handle. It will route through other compound nodes, creating visual spaghetti.
**Do this instead:** Ensure every visible edge has a valid ELK route from the layout phase where it belongs. If an edge truly cannot be routed (orphan edge, edge to filtered node), provide a custom fallback that respects compound boundaries.

### Anti-Pattern 4: Mixing Absolute and Relative Coordinates

**What people do:** Compute edge routes in absolute coordinates but node positions in relative coordinates (to parent), leading to coordinate space mismatches.
**Why it's wrong:** ELK's `json.edgeCoords: ROOT` puts edge coordinates in root space, but React Flow positions child nodes relative to their parent. The `trimPathToHandles` function then clamps to absolute bounds, creating misaligned endpoints.
**Do this instead:** Choose one coordinate space and be explicit. Internal edges: compute in compound-local space (Phase 1), then translate to absolute for rendering. Cross-compound edges: compute in root space (Phase 2), use directly.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1-5 types (simple model) | Current pipeline works; most compounds have <5 children. Single layout phase may suffice. |
| 5-15 types (medium model) | Bottom-up pipeline pays off: 5-15 internal ELK passes + 1 global pass. Total layout time ~50-200ms. |
| 15-30 types (large model) | Consider parallel internal layout passes (ELK calls are independent per compound). May need layout debouncing on rapid model changes. |
| 30+ types (extreme) | Viewport-aware layout: only lay out visible compounds, lazy-layout off-screen compounds on scroll. LRU cache becomes critical. |

### Scaling Priorities

1. **First bottleneck: ELK computation time.** With `INCLUDE_CHILDREN`, layout time scales superlinearly with graph size because ELK considers all hierarchy levels simultaneously. Bottom-up approach scales linearly (N small passes + 1 medium pass instead of 1 huge pass).
2. **Second bottleneck: React Flow re-render.** Large node counts cause slow React reconciliation. Already mitigated by `React.memo` on all node/edge components and individual Zustand selectors.

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Store -> Canvas | Zustand selectors | `getVisibleGraph()` returns stable refs when inputs unchanged |
| Canvas -> Layout | Function call (async) | `getLayoutedElements()` returns positioned nodes + enriched edges |
| Layout -> Edge Components | `edge.data.elkRoute` | Edge components check for ElkRoute presence at render time |
| Hover Store -> Node/Edge Components | Zustand micro-selectors | `useNodeInteraction` / `useEdgeInteraction` compute visual state |
| Layout Cache -> Layout Engine | Module-level LRU | Cache key includes direction + sorted node/edge IDs with dimensions |

### Build Order (Dependencies)

The following build order respects dependencies between components:

```
1. Edge Classification
   └── Needs: fgaToFlow (parent membership data)
   └── Produces: internal/cross edge classification
   └── No other layout dependency

2. Internal Compound Layout (refactor elk-layout.ts Phase 1)
   └── Needs: Edge Classification, ELK
   └── Produces: child positions, internal routes, compound dimensions
   └── Independent per compound (parallelizable)

3. Global Root Layout (refactor elk-layout.ts Phase 2)
   └── Needs: Internal Layout results (compound dimensions)
   └── Produces: compound positions, cross-compound routes

4. Route Assembly (new function in elk-layout.ts)
   └── Needs: Both layout phases complete
   └── Produces: final elkRoute per edge

5. Consolidated Edge Component (refactor canvas/edges/)
   └── Needs: Route Assembly (consumes elkRoute data)
   └── Can be done in parallel with layout refactor since interface (elkRoute) stays the same

6. Cross-Compound Edge Styling
   └── Needs: Edge Classification (to know which edges are cross-compound)
   └── Needs: Consolidated Edge Component (single place to apply style)

7. Interaction Updates (path tracing, hover, focus)
   └── Needs: All of the above working
   └── Builds on stable layout foundation
```

**Phase grouping for roadmap:**
- **Phase 1 (Layout Foundation):** Items 1-4 above. This is the structural rewrite of `elk-layout.ts`.
- **Phase 2 (Edge Cleanup):** Items 5-6. Consolidate edge components, add cross-compound styling.
- **Phase 3 (Exploration):** Item 7. Path tracing, hover interaction, focus mode on stable layout.

## Sources

- [ELK Layered Algorithm Reference](https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-layered.html) -- Comprehensive layout options (HIGH confidence)
- [ELK Edge Routing Options](https://eclipse.dev/elk/reference/options/org-eclipse-elk-edgeRouting.html) -- POLYLINE/ORTHOGONAL/SPLINES modes (HIGH confidence)
- [ELK Hierarchy Handling](https://eclipse.dev/elk/reference/options/org-eclipse-elk-hierarchyHandling.html) -- INCLUDE_CHILDREN vs SEPARATE_CHILDREN (HIGH confidence)
- [React Flow Sub Flows Documentation](https://reactflow.dev/learn/layouting/sub-flows) -- parentId, extent, compound node patterns (HIGH confidence)
- [elkjs GitHub Repository](https://github.com/kieler/elkjs) -- API usage patterns, coordinate modes (HIGH confidence)
- Existing codebase analysis: `src/layout/elk-layout.ts`, `src/canvas/fgaToFlow.ts`, `src/canvas/FgaGraph.tsx`, all edge components (HIGH confidence -- direct source code)

---
*Architecture research for: Compound graph layout pipeline*
*Researched: 2026-02-21*
