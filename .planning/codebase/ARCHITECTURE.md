# Architecture

**Analysis Date:** 2026-02-21

## Pattern Overview

**Overall:** Single-page application with a unidirectional data pipeline

**Key Characteristics:**
- FGA DSL text is parsed into a domain graph, filtered, converted to React Flow elements, laid out by ELK, then rendered
- Zustand stores are the single source of truth; components select individual fields to minimize re-renders
- Layout is async (ELK runs its own internal Web Worker) and results are LRU-cached
- The application has no backend -- it runs entirely in the browser with `localStorage` persistence

## Layers

**Parser Layer:**
- Purpose: Convert OpenFGA DSL text into a domain-level `AuthorizationGraph`
- Location: `src/parser/`
- Contains: DSL-to-JSON transformation (via `@openfga/syntax-transformer`), graph construction from JSON model, sample model
- Key file: `src/parser/parse-model.ts` -- `buildAuthorizationGraph(dsl: string): AuthorizationGraph`
- Depends on: `@openfga/syntax-transformer`, `src/types.ts`
- Used by: `src/store/viewer-store.ts` (the `parse()` action)

**Store Layer:**
- Purpose: Hold all application state and expose actions that mutate it
- Location: `src/store/`
- Contains: Two Zustand stores -- one main store, one micro-store for hover state
- Key files:
  - `src/store/viewer-store.ts` -- main store: FGA source, parsed graph, filters, focus mode, path tracing, UI toggles, derived `getVisibleGraph()`
  - `src/store/hover-store.ts` -- isolated hover state: `hoveredNodeId`, TTU-expanded node set, focal node set
- Depends on: `src/parser/parse-model.ts`, `src/graph/traversal.ts`, `src/types.ts`
- Used by: Every UI component

**Graph Algorithms Layer:**
- Purpose: Graph traversal, filtering, and analysis algorithms that operate on the domain `AuthorizationGraph`
- Location: `src/graph/`
- Contains: Neighborhood computation (k-hop BFS), path finding (BFS all simple paths), TTU hover expansion, filter application, depth layering (Kahn's algorithm), type name extraction
- Key file: `src/graph/traversal.ts`
- Depends on: `src/types.ts`
- Used by: `src/store/viewer-store.ts` (`getVisibleGraph()`, `tracePath()`), `src/store/hover-store.ts` (`expandViaTtu`)

**Canvas Layer (React Flow):**
- Purpose: Convert domain graph to React Flow elements and orchestrate rendering, layout, and interaction
- Location: `src/canvas/`
- Contains: React Flow wrapper, domain-to-flow conversion, custom node components, custom edge components, interaction hooks
- Key files:
  - `src/canvas/Canvas.tsx` -- ReactFlowProvider wrapper, empty-state handling
  - `src/canvas/FgaGraph.tsx` -- core orchestration: subscribes to store, converts to flow elements, triggers ELK layout, wires event handlers
  - `src/canvas/fgaToFlow.ts` -- `toFlowElements()`: maps `AuthorizationNode[]`/`AuthorizationEdge[]` to React Flow `Node[]`/`Edge[]`, filters out TTU edges, marks compound/child relationships
  - `src/canvas/nodes/TypeNode.tsx` -- compound (container) and leaf type nodes
  - `src/canvas/nodes/RelationNode.tsx` -- relation nodes (with tupleset binding variant)
  - `src/canvas/nodes/PermissionNode.tsx` -- permission nodes (pill-shaped)
  - `src/canvas/nodes/useNodeInteraction.ts` -- computes `dimmed` state from hover/trace context
  - `src/canvas/edges/DirectEdge.tsx`, `ComputedEdge.tsx`, `TuplesetDepEdge.tsx` -- custom edge renderers that prefer ELK routes, fall back to `getSmoothStepPath`
  - `src/canvas/edges/useEdgeInteraction.ts` -- computes edge visual state (stroke, opacity, glow) from hover/trace/selection context
- Depends on: `src/store/`, `src/layout/`, `src/theme/`, `@xyflow/react`
- Used by: `src/App.tsx`

**Layout Layer:**
- Purpose: Position nodes and route edges using ELK (Eclipse Layout Kernel)
- Location: `src/layout/`
- Contains: ELK graph construction, 3-pass layout pipeline, LRU cache, SVG path generation and trimming
- Key files:
  - `src/layout/elk-layout.ts` -- `getLayoutedElements()`: the public API. Builds hierarchical ELK graph, runs Pass 1 (layered layout with `INCLUDE_CHILDREN`), Pass 2 (grid redistribution for oversized compounds), Pass 3 (root repack)
  - `src/layout/elk-path.ts` -- `elkPointsToPath()` (SVG path with rounded corners), `trimPathToHandles()` (endpoint clamping), `getPathMidpointWithOffset()` (label positioning)
- Depends on: `elkjs/lib/elk.bundled.js`, `@xyflow/react` types
- Used by: `src/canvas/FgaGraph.tsx`, `src/canvas/edges/` (path rendering)

**Theme Layer:**
- Purpose: Centralized color palette and type-based coloring
- Location: `src/theme/`
- Key file: `src/theme/colors.ts` -- exports `blueprint` object (background, surface, edge colors, UI colors), `TYPE_PALETTE` (named type colors), `getTypeColor()` (hash-based fallback for unknown types)
- Depends on: Nothing
- Used by: Every visual component

**Editor Layer:**
- Purpose: CodeMirror-based FGA DSL editor with syntax highlighting
- Location: `src/editor/`
- Contains: Editor panel UI, CodeMirror integration, FGA stream parser, custom theme
- Key files:
  - `src/editor/EditorPanel.tsx` -- panel wrapper with header, error display, collapse/expand
  - `src/editor/FgaEditor.tsx` -- CodeMirror 6 EditorView setup, 300ms debounced parsing
  - `src/editor/fga-language.ts` -- StreamLanguage parser for FGA DSL syntax (keywords, types, relations, operators)
  - `src/editor/fga-theme.ts` -- dark blueprint CodeMirror theme + syntax highlighting
- Depends on: `@codemirror/*`, `@lezer/*`, `src/store/viewer-store.ts`, `src/theme/colors.ts`
- Used by: `src/App.tsx`

**Toolbar Layer:**
- Purpose: Bottom toolbar with search, filter toggles, import, legend, and navigation
- Location: `src/toolbar/`
- Key files:
  - `src/toolbar/Toolbar.tsx` -- bottom-center floating toolbar with icon buttons
  - `src/toolbar/CommandPalette.tsx` -- cmd+K search overlay, fuzzy-matches nodes, navigates to node on selection
- Depends on: `src/store/viewer-store.ts`, `src/theme/colors.ts`
- Used by: `src/App.tsx`

**Legend Layer:**
- Purpose: Visual legend panel explaining node and edge types
- Location: `src/legend/`
- Key file: `src/legend/LegendPanel.tsx` -- animated slide-up panel with node/edge swatch examples
- Depends on: `src/store/viewer-store.ts`, `src/theme/colors.ts`
- Used by: `src/App.tsx`

## Data Flow

**Primary Pipeline: FGA DSL to Rendered Graph**

1. **Source Input** -- User types in CodeMirror editor (`src/editor/FgaEditor.tsx`), or drops a file, or loads from `localStorage`. Source text is stored as `fgaSource` in the viewer store.
2. **Parse** -- `viewer-store.parse()` calls `buildAuthorizationGraph(dsl)` (`src/parser/parse-model.ts`), which uses `@openfga/syntax-transformer` to convert DSL to JSON, then walks type definitions to build `AuthorizationNode[]` and `AuthorizationEdge[]`. The result is stored in the viewer store along with an incremented `parseVersion`.
3. **Filter + Focus** -- `viewer-store.getVisibleGraph()` applies `applyFilters()` (type filter, permissions-only filter) then optionally scopes to a neighborhood (`computeNeighborhood()`) based on focus mode. Results are module-level cached outside Zustand to avoid immutability overhead.
4. **Convert to Flow** -- `toFlowElements()` (`src/canvas/fgaToFlow.ts`) maps domain nodes to React Flow nodes (typed as `type`, `relation`, or `permission`), marks compound parent-child relationships, and filters out TTU edges (they never render -- they exist only for hover expansion BFS).
5. **ELK Layout** -- `getLayoutedElements()` (`src/layout/elk-layout.ts`) runs the 3-pass layout:
   - **Pass 1**: Hierarchical ELK layered algorithm with `INCLUDE_CHILDREN` and `json.edgeCoords: ROOT`. Type nodes become compound containers; their relations/permissions become children.
   - **Pass 2**: Grid redistribution -- compounds exceeding `MAX_COMPOUND_SIZE` (1100px) get their children redistributed into a band-based grid (relations band then permissions band, column-major).
   - **Pass 3**: Root repack -- a flat ELK pass repositions compound nodes with their new post-redistribution sizes.
   - Result: positioned nodes with parent-child links, edges enriched with `elkRoute` data (ELK-computed polyline points, trimmed to handle positions).
6. **Render** -- `FgaGraph.tsx` feeds positioned nodes/edges to `<ReactFlow>`. Custom node components (`TypeNode`, `RelationNode`, `PermissionNode`) and custom edge components (`DirectEdge`, `ComputedEdge`, `TuplesetDepEdge`) read from hover/trace stores to determine dimming and highlighting.

**Secondary Flow: Hover Interaction**

1. User hovers over a node in `FgaGraph.tsx` -> `onNodeMouseEnter` fires
2. `hover-store.setHoveredNode(id, fullEdges)` runs `expandViaTtu()` BFS on TTU edges from the hovered node
3. `buildHoverSets()` computes `expandedNodeIds` (TTU-reachable) and `focalNodeIds` (expanded + 1-hop rendered-edge neighbors)
4. Node components read `focalNodeIds` via `useNodeInteraction` to decide if they're dimmed
5. Edge components read `expandedNodeIds` via `useEdgeInteraction` to decide if they're highlighted or dimmed

**Secondary Flow: Path Tracing**

1. User sets `pathStart` and `pathEnd` node IDs
2. `viewer-store.tracePath()` calls `findPaths()` (BFS all simple paths, max depth 10) and `collectPathElements()` to build `tracedNodeIds` and `tracedEdgeIds` sets
3. Node/edge interaction hooks check membership in traced sets for highlight/dim decisions

## Key Abstractions

**`AuthorizationGraph` (`src/types.ts`):**
- Purpose: Domain model representing the parsed FGA authorization model as a directed graph
- Contains `AuthorizationNode[]` and `AuthorizationEdge[]`
- Nodes are either `type` (FGA object type) or `relation` (type#relation pair)
- Edges carry a `RewriteRule` discriminant: `direct`, `computed`, `ttu`, or `tupleset-dep`
- TTU edges exist in the full graph but are never rendered; they drive hover expansion

**`FgaNodeData` (`src/canvas/fgaToFlow.ts`):**
- Purpose: React Flow node data payload bridging domain model to visual rendering
- Contains: `typeName`, `relation`, `isPermission`, `definition`, `isCompound`, `hasParent`, `isTuplesetBinding`, `referencedType`

**`ElkRoute` (`src/layout/elk-layout.ts`):**
- Purpose: Edge routing data from ELK, attached to React Flow edge data
- Contains: `points: Point[]` -- polyline waypoints in root-space coordinates
- When present, edge components use `elkPointsToPath()` for SVG rendering; otherwise fall back to React Flow's `getSmoothStepPath()`

**Visual State Hooks:**
- `useNodeInteraction(nodeId)` (`src/canvas/nodes/useNodeInteraction.ts`) -- returns `{ dimmed: boolean }` based on hover/trace context
- `useEdgeInteraction(edgeId, source, target, edgeType)` (`src/canvas/edges/useEdgeInteraction.ts`) -- returns `{ stroke, strokeWidth, opacity, filter, zIndex }` with 4-level priority: traced > selected > hovered > rest

**`ViewerStore` (`src/store/viewer-store.ts`):**
- Purpose: Central application state + actions
- Pattern: Zustand store with `create<ViewerStore>((set, get) => ({...}))`
- Key derived computation: `getVisibleGraph()` -- module-level cached, recomputes only when cache key changes
- Persists `fgaSource` and `editorWidth` to `localStorage`

**`HoverStore` (`src/store/hover-store.ts`):**
- Purpose: Isolated micro-store for hover state to avoid main store churn on mouse events
- Contains: `hoveredNodeId`, `expandedNodeIds` (TTU BFS), `focalNodeIds` (expanded + 1-hop)

## Entry Points

**Application Entry (`src/main.tsx`):**
- Location: `src/main.tsx`
- Triggers: Vite dev server / production build
- Responsibilities: Creates React root, renders `<App />` in StrictMode

**App Root (`src/App.tsx`):**
- Location: `src/App.tsx`
- Triggers: React render
- Responsibilities: Calls `parse()` on mount, sets up keyboard shortcuts (Cmd+E toggle editor, Cmd+K toggle search, Escape close search), sets up file drag-and-drop, composes layout: `EditorPanel | ResizeHandle | Canvas + Toolbar + LegendPanel`

**Build Entry (`index.html`):**
- Location: `index.html`
- Triggers: Browser load
- Responsibilities: Loads `src/main.tsx` as module script, sets up meta tags and OG data

## Error Handling

**Strategy:** Catch at boundaries, display inline, never crash the app

**Patterns:**
- **Parser errors**: `viewer-store.parse()` catches exceptions from `buildAuthorizationGraph()`, stores error message in `parseError`, clears the graph. `EditorPanel.tsx` displays the error at the bottom of the editor panel.
- **Layout failures**: ELK `layout()` is async; if it throws, the `cancelled` flag in `FgaGraph.tsx` prevents stale updates, but there is no explicit error UI for layout failures.
- **Empty state**: `Canvas.tsx` renders a centered message when `nodes.length === 0`, distinguishing between parse errors and no-model states.
- **Graceful degradation for edges**: When ELK routes are unavailable (redistribution invalidated them or no route computed), edge components fall back to React Flow's `getSmoothStepPath()`.

## Cross-Cutting Concerns

**Theming:** Centralized in `src/theme/colors.ts` via the `blueprint` object and `TYPE_PALETTE`. All components import from this module. CSS custom properties defined in `src/index.css` via Tailwind v4's `@theme` directive mirror the blueprint palette.

**Caching:**
- ELK layout results: LRU cache (5 entries) in `src/layout/elk-layout.ts`, keyed on direction + sorted node IDs with dimensions + sorted edge IDs
- Visible graph: Module-level cache in `src/store/viewer-store.ts` (`_cacheKey`, `_cachedVisibleNodes`, `_cachedVisibleEdges`), keyed on `parseVersion | nodeCount | edgeCount | filtersStr | focusMode | selectedNodeId | neighborhoodHops`

**Persistence:** `localStorage` for `fgaSource` (key: `openfga-viewer-source`) and `editorWidth` (key: `openfga-viewer-editor-width`). Falls back to `SAMPLE_FGA_MODEL` on first load.

**Performance Optimization:**
- All node and edge components wrapped in `React.memo`
- Zustand selectors select individual primitives/stable refs to minimize re-renders
- Hover state isolated in separate micro-store
- `startTransition` wraps focus mode and filter changes for non-blocking updates
- CSS `transition` on node transforms and edge paths for smooth layout animations

## Module Dependency Graph

```
types.ts
  |
  +-- parser/parse-model.ts
  |     |
  +-- graph/traversal.ts
  |     |
  +-- store/viewer-store.ts  <-- depends on parser + graph
  |     |
  +-- store/hover-store.ts   <-- depends on graph (expandViaTtu)
  |     |
  +-- canvas/fgaToFlow.ts    <-- depends on types + theme
  |     |
  +-- layout/elk-layout.ts   <-- depends on elk-path, elkjs
  |   |
  |   +-- layout/elk-path.ts
  |
  +-- canvas/FgaGraph.tsx     <-- depends on store + fgaToFlow + layout
  |   |
  |   +-- canvas/nodes/*      <-- depends on store + theme + useNodeInteraction
  |   +-- canvas/edges/*      <-- depends on store + theme + layout/elk-path + useEdgeInteraction
  |
  +-- editor/*                <-- depends on store + codemirror
  +-- toolbar/*               <-- depends on store + theme
  +-- legend/*                <-- depends on store + theme
  +-- components/*            <-- depends on store + theme
  |
  +-- App.tsx                 <-- composes all layers
  +-- main.tsx                <-- entry point
```

---

*Architecture analysis: 2026-02-21*
