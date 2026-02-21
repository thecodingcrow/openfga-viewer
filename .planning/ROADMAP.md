# Roadmap: OpenFGA Viewer -- Visual Overhaul

## Overview

Replace the compound node visualization with ERD schema cards, dimension-aware edges, subgraph exploration, and 1-pass flat ELK layout. Phases 1-7 build new systems alongside the existing pipeline. Phase 8 swaps the pipeline and deletes old components. Phases 9-10 add UI controls and path tracing polish. The parser and editor are untouched -- only the visualization pipeline changes.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Types & Dimension Detection** - Foundation types, dimension detection algorithm, edge classification, schema card builder, and subgraph extraction
- [ ] **Phase 2: Dimension Colors & Theme** - Colorblind-safe categorical palette for dimension-colored edges and type-restriction styling
- [ ] **Phase 3: ERD Schema Card Component** - New SchemaCard node component with binding/relation/permission sections and row-level interaction
- [ ] **Phase 4: Edge Consolidation** - Unified DimensionEdge component replacing three near-identical edge components
- [ ] **Phase 5: Flow Conversion Rewrite** - New schemaToFlow conversion layer producing one React Flow node per type with row-level ports
- [ ] **Phase 6: Layout Simplification** - 1-pass flat ELK layout with orthogonal routing replacing the 3-pass compound system
- [ ] **Phase 7: Store Updates** - Dimension state, subgraph state, and row-level directional hover in Zustand stores
- [ ] **Phase 8: Wire It Together** - Switch FgaGraph to new pipeline, add minimap/controls, delete old components
- [ ] **Phase 9: UI Controls** - Dimension toggles, card collapse, legend, type filtering, permissions-only toggle, command palette
- [ ] **Phase 10: Path Tracing Polish** - Expression annotation, recursive hierarchy indicators, animated subgraph transitions

## Phase Details

### Phase 1: Types & Dimension Detection
**Goal**: The data model can classify every edge, detect structural dimensions, build schema card data, and extract directional subgraphs from any authorization model
**Depends on**: Nothing (first phase)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04
**Success Criteria** (what must be TRUE):
  1. Dimensions are auto-detected from TTU tupleset patterns -- each dimension groups cross-type edges sharing the same structural binding
  2. Every edge in the authorization graph is classified as either `type-restriction` (direct) or `dimension` (TTU), with same-card edges (computed, tupleset-dep) excluded from cross-card rendering
  3. Schema cards are built for each type with correct binding/relation/permission row classification and readable expression strings using dimension annotation notation
  4. Upstream and downstream subgraph extraction produces correct node/edge sets and identifies binding bridge nodes
**Plans**: TBD

Plans:
- [ ] 01-01: TBD

### Phase 2: Dimension Colors & Theme
**Goal**: Every dimension has a visually distinct, colorblind-safe color and type-restriction edges have a muted style that distinguishes them from dimension edges
**Depends on**: Phase 1
**Requirements**: VIZ-04, VIZ-05
**Success Criteria** (what must be TRUE):
  1. Cross-card edges use dimension-specific colors from a categorical palette that is colorblind-safe and dark-theme compatible
  2. Type restriction (direct) edges use muted slate styling visually distinct from dimension-colored edges
  3. Dimension color assignment is deterministic -- the same model always produces the same color mapping
**Plans**: TBD

Plans:
- [ ] 02-01: TBD

### Phase 3: ERD Schema Card Component
**Goal**: Types render as ERD-style cards with ownership, relation, and permission sections, row-level ports for edge connections, and row-level hover interaction
**Depends on**: Phase 1, Phase 2
**Requirements**: VIZ-01, VIZ-02, VIZ-03, VIZ-08, INT-01, INT-02
**Success Criteria** (what must be TRUE):
  1. Each type renders as a single ERD card with dark glass styling, type-colored accent bar, and three sections: bindings (with dimension-colored dot indicators), relations, and permissions
  2. Permission rows display readable expressions with dimension annotation notation showing cross-type access channels
  3. Hovering a permission row highlights upstream feeding paths without changing the layout (preview mode)
  4. Hovering a card header highlights downstream enabled paths without changing the layout (preview mode)
  5. Each row renders source and target React Flow Handles for row-level edge port routing
**Plans**: TBD

Plans:
- [ ] 03-01: TBD

### Phase 4: Edge Consolidation
**Goal**: A single parameterized edge component handles all cross-card edge rendering with dimension-aware styling and interaction states
**Depends on**: Phase 2
**Requirements**: None (infrastructure -- enables VIZ-04, VIZ-05 rendering when wired in Phase 8)
**Success Criteria** (what must be TRUE):
  1. One DimensionEdge component replaces DirectEdge, ComputedEdge, and TuplesetDepEdge with visual style driven by edge classification data
  2. Edge component supports dimension-colored rendering, path trace highlighting (glow), hover dimming, and subgraph dimming states
  3. TTU edges remain filtered from rendering -- they never appear as visible edges
**Plans**: TBD

Plans:
- [ ] 04-01: TBD

### Phase 5: Flow Conversion Rewrite
**Goal**: Schema cards and classified edges convert to React Flow elements with one node per type and row-level port definitions for handle-aware edge routing
**Depends on**: Phase 1, Phase 3
**Requirements**: None (infrastructure -- enables correct rendering when wired in Phase 8)
**Success Criteria** (what must be TRUE):
  1. Each SchemaCard produces exactly one React Flow node with type `schemaCard` and row-level Handle IDs matching port definitions
  2. Each ClassifiedEdge produces one React Flow edge with source/target handle IDs pointing to the correct row ports (dimension edges target binding row ports, type-restriction edges target header ports)
  3. Same-card dependencies (computed, tupleset-dep) produce no edges -- they appear only as expression text within card rows
**Plans**: TBD

Plans:
- [ ] 05-01: TBD

### Phase 6: Layout Simplification
**Goal**: A single-pass flat ELK layout with orthogonal edge routing positions cards and routes edges correctly in both TB and LR directions
**Depends on**: Phase 5
**Requirements**: VIZ-06, VIZ-07
**Success Criteria** (what must be TRUE):
  1. Graph uses 1-pass flat ELK layout with orthogonal edge routing -- no compound nodes, no grid redistribution, no root repack
  2. Layout direction toggle switches between TB and LR and produces correct positions in both directions
  3. Port constraints are FIXED_ORDER with ports ordered by row position, producing natural edge bundling at binding row ports
  4. Card dimensions are calculated before layout and passed to ELK for accurate positioning
**Plans**: TBD

Plans:
- [ ] 06-01: TBD

### Phase 7: Store Updates
**Goal**: Zustand stores manage dimension toggles, subgraph navigation state, and row-level directional hover -- enabling click-to-explore subgraph workflows
**Depends on**: Phase 1
**Requirements**: INT-03, INT-04, INT-05
**Success Criteria** (what must be TRUE):
  1. Clicking a permission row enters upstream subgraph view -- non-relevant cards are removed and the remaining cards re-layout
  2. Clicking a card header enters downstream subgraph view -- non-relevant cards are removed and the remaining cards re-layout
  3. Pressing Esc or clicking a back button exits subgraph view and returns to the full graph
  4. Row-level hover triggers directional path highlighting (upstream for permissions, downstream for card headers) via the hover store
**Plans**: TBD

Plans:
- [ ] 07-01: TBD

### Phase 8: Wire It Together
**Goal**: The app renders with the new ERD card pipeline end-to-end, old components are deleted, and minimap/controls are available
**Depends on**: Phase 3, Phase 4, Phase 5, Phase 6, Phase 7
**Requirements**: CTRL-07, CTRL-08
**Success Criteria** (what must be TRUE):
  1. FgaGraph uses the new pipeline: schemaToFlow conversion, flat ELK layout, SchemaCard nodes, DimensionEdge edges
  2. Old node components (TypeNode, RelationNode, PermissionNode), old edge components (DirectEdge, ComputedEdge, TuplesetDepEdge), old conversion (fgaToFlow), and old layout (elk-layout) are deleted
  3. Minimap shows graph overview and controls panel provides zoom/fit functionality
  4. The default model renders correctly with ERD cards and dimension-colored edges in the browser
**Plans**: TBD

Plans:
- [ ] 08-01: TBD

### Phase 9: UI Controls
**Goal**: Users can filter the graph by dimension, type, and detail level through toolbar controls, and navigate to any type/relation/permission via command palette
**Depends on**: Phase 8
**Requirements**: INT-06, CTRL-01, CTRL-02, CTRL-03, CTRL-04, CTRL-05, CTRL-06
**Success Criteria** (what must be TRUE):
  1. Dimension toggle chips in toolbar show one chip per detected dimension -- toggling hides/shows that dimension's edges, modifier+click enables solo mode
  2. Type filtering shows/hides entire cards and permissions-only toggle collapses relation sections on all cards
  3. Double-clicking a card header collapses it to header-only, triggering re-layout
  4. Command palette (Cmd+K) searches types, relations, and permissions with results grouped by type, navigating to the matching card/row on selection
  5. Legend displays dimension color key and row type icons (circle=relation, diamond=permission, dot=binding)
**Plans**: TBD

Plans:
- [ ] 09-01: TBD

### Phase 10: Path Tracing Polish
**Goal**: Path tracing within subgraphs annotates expressions, indicates recursive hierarchies, and subgraph transitions are animated
**Depends on**: Phase 8
**Requirements**: VIZ-09, PATH-01, PATH-02, PATH-03
**Success Criteria** (what must be TRUE):
  1. In subgraph view, traced paths highlight specific expression terms in accent color within permission rows (e.g., the active term is bold/colored while others remain muted)
  2. Binding rows that enable TTU hops display a bridge highlight indicator during path trace
  3. Self-referencing dimensions show an info icon with tooltip explaining recursive inheritance (e.g., "Permission can be inherited from parent categories")
  4. Subgraph enter/exit uses animated transitions -- non-relevant cards fade out, remaining cards animate to new positions, and returning shows all cards fading back in
**Plans**: TBD

Plans:
- [ ] 10-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Types & Dimension Detection | 0/0 | Not started | - |
| 2. Dimension Colors & Theme | 0/0 | Not started | - |
| 3. ERD Schema Card Component | 0/0 | Not started | - |
| 4. Edge Consolidation | 0/0 | Not started | - |
| 5. Flow Conversion Rewrite | 0/0 | Not started | - |
| 6. Layout Simplification | 0/0 | Not started | - |
| 7. Store Updates | 0/0 | Not started | - |
| 8. Wire It Together | 0/0 | Not started | - |
| 9. UI Controls | 0/0 | Not started | - |
| 10. Path Tracing Polish | 0/0 | Not started | - |
