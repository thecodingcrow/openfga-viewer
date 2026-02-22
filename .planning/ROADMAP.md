# Roadmap: OpenFGA Viewer -- Visual Overhaul

## Overview

Rip out the entire compound node visualization pipeline and replace it with ERD schema cards, dimension-aware edges, subgraph exploration, and 1-pass flat ELK layout. No backward compatibility -- delete old, build new. The parser and editor are untouched.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Core Pipeline** - Delete old visualization pipeline. Build new: types, dimensions, schema cards, dimension colors, edge component, flow conversion, flat ELK layout, store updates, wire FgaGraph. End state: ERD cards rendering with dimension-colored edges.
- [ ] **Phase 2: Interaction & Polish** - Subgraph exploration (click to navigate), dimension toggles, type filtering, card collapse, legend, command palette, path tracing with expression annotation, recursive hierarchy indicators, animated transitions.

## Phase Details

### Phase 1: Core Pipeline
**Goal**: The app renders authorization models as ERD schema cards with dimension-colored edges, flat ELK layout, hover highlighting, minimap, and controls -- old compound pipeline fully deleted
**Depends on**: Nothing (first phase)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, VIZ-01, VIZ-02, VIZ-03, VIZ-04, VIZ-05, VIZ-06, VIZ-07, VIZ-08, INT-01, INT-02, CTRL-07, CTRL-08
**Success Criteria** (what must be TRUE):
  1. Dimensions auto-detected from TTU tupleset patterns, every edge classified as type-restriction or dimension, same-card edges excluded
  2. Types render as ERD cards with dark glass styling, type-colored accent bar, binding/relation/permission sections, dimension-colored dots on bindings, and readable expressions with dimension annotations
  3. Single DimensionEdge component renders all cross-card edges with dimension colors (categorical, colorblind-safe) or muted slate for type restrictions
  4. 1-pass flat ELK layout with orthogonal routing positions cards correctly in both TB and LR directions with row-level port routing
  5. Hovering permission rows highlights upstream paths, hovering card headers highlights downstream paths (no layout change)
  6. Old node components (TypeNode, RelationNode, PermissionNode), old edge components (DirectEdge, ComputedEdge, TuplesetDepEdge), old conversion (fgaToFlow), and old layout (elk-layout) are deleted
  7. Minimap and controls panel are available
  8. Default model renders correctly in browser
**Plans**: 4 plans

Plans:
- [ ] 01-01-PLAN.md -- Data layer: dimension detection, edge classification, expression transform, colorblind-safe palette
- [ ] 01-02-PLAN.md -- ERD card node, dimension edge component, flow conversion rewrite
- [ ] 01-03-PLAN.md -- 1-pass flat ELK layout with ports, FgaGraph wiring, MiniMap, Controls
- [ ] 01-04-PLAN.md -- Row-level hover highlighting, store updates, delete old pipeline

### Phase 2: Interaction & Polish
**Goal**: Users can explore subgraphs by clicking, filter by dimension and type, collapse cards, search via command palette, and see annotated path traces with animated transitions
**Depends on**: Phase 1
**Requirements**: INT-03, INT-04, INT-05, INT-06, VIZ-09, PATH-01, PATH-02, PATH-03, CTRL-01, CTRL-02, CTRL-03, CTRL-04, CTRL-05, CTRL-06
**Success Criteria** (what must be TRUE):
  1. Clicking a permission row enters upstream subgraph (removes non-relevant cards, re-lays out); clicking a card header enters downstream subgraph; Esc exits
  2. Dimension toggle chips in toolbar -- one per dimension, togglable, modifier+click for solo mode
  3. Type filtering shows/hides cards, permissions-only toggle collapses relation sections, double-click collapses cards to header-only
  4. Command palette (Cmd+K) searches types/relations/permissions with card/row navigation
  5. Traced paths highlight specific expression terms in accent color, binding bridges show indicators, self-referencing dimensions show info tooltip
  6. Legend shows dimension colors and row type icons
  7. Subgraph enter/exit uses animated transitions (fade + reposition)
**Plans**: TBD

Plans:
- [ ] 02-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Core Pipeline | 0/4 | Planned | - |
| 2. Interaction & Polish | 0/0 | Not started | - |
