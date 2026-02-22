# Roadmap: OpenFGA Viewer -- Visual Overhaul

## Overview

Rip out the entire compound node visualization pipeline and replace it with ERD schema cards, dimension-aware edges, subgraph exploration, and 1-pass flat ELK layout. No backward compatibility -- delete old, build new. The parser and editor are untouched.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Core Pipeline** - Delete old visualization pipeline. Build new: types, dimensions, schema cards, dimension colors, edge component, flow conversion, flat ELK layout, store updates, wire FgaGraph. End state: ERD cards rendering with dimension-colored edges.
- [ ] **Phase 2: Interaction & Polish** - Subgraph exploration (click to navigate), dimension toggles, type filtering, card collapse, legend, command palette, path tracing with expression annotation, recursive hierarchy indicators, animated transitions.
- [ ] **Phase 3: Visual Refinement** - Replace AI-generated aesthetic with polished devtool/HUD design language. Linear/Vercel-quality typography, spacing, color palette, and component polish.

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
- [x] 01-01-PLAN.md -- Data layer: dimension detection, edge classification, expression transform, colorblind-safe palette
- [x] 01-02-PLAN.md -- ERD card node, dimension edge component, flow conversion rewrite
- [x] 01-03-PLAN.md -- 1-pass flat ELK layout with ports, FgaGraph wiring, MiniMap, Controls
- [x] 01-04-PLAN.md -- Row-level hover highlighting, store updates, delete old pipeline

### Phase 2: Interaction & Polish
**Goal**: Users can explore subgraphs by clicking, navigate via breadcrumb/Esc/browser back, collapse cards, search via fuzzy command palette, inspect authorization model tree, and experience a cohesive HUD-style interface with animated transitions
**Depends on**: Phase 1
**Requirements**: INT-03, INT-04, INT-05, INT-06, VIZ-09, PATH-03, CTRL-01, CTRL-02, CTRL-03, CTRL-04, CTRL-05, CTRL-06
**Success Criteria** (what must be TRUE):
  1. Clicking a permission row enters upstream subgraph (removes non-relevant cards, re-lays out); clicking a card header enters downstream subgraph; Esc/back exits
  2. Inspect panel provides interactive tree view replacing legend and dimension toggles (CTRL-01, CTRL-02, CTRL-03, CTRL-04, CTRL-06 killed per user decision)
  3. Double-click collapses cards to header-only with re-layout
  4. Command palette (Cmd+K) uses fuzzy search with grouped results, subgraph navigation on select
  5. Self-referencing dimensions show info tooltip on binding rows
  6. HUD aesthetic with mustard accent, floating pill toolbar, editor overlay, dot grid canvas
  7. Subgraph enter/exit uses two-phase animated transitions (fade + reposition)
  8. PATH-01, PATH-02 deferred to Phase 3 per user decision
**Plans**: 7 plans

Plans:
- [ ] 02-01-PLAN.md -- HUD theming, overlay layout, toolbar redesign, delete LegendPanel
- [ ] 02-02-PLAN.md -- Navigation stack state machine, collapse state, browser history, self-referencing detection
- [ ] 02-03-PLAN.md -- Subgraph navigation UI, two-phase animated transitions, row dimming, card collapse
- [ ] 02-04-PLAN.md -- Breadcrumb trail, Esc key navigation, browser popstate handler
- [ ] 02-05-PLAN.md -- Command palette upgrade with fuse.js fuzzy search, grouped results, subgraph navigation
- [ ] 02-06-PLAN.md -- Inspect panel with interactive tree view, re-rooting, hover-to-highlight
- [ ] 02-07-PLAN.md -- Integration verification checkpoint (human-verify)

### Phase 3: Visual Refinement
**Goal**: Replace AI-generated aesthetic with polished devtool/HUD design language -- warm dark palette via CSS custom properties, solid surface cards, muted edges, desaturated editor theme, right-docked toolbar, all-monospace typography, zero blue tint
**Depends on**: Phase 2
**Requirements**: THEME-01, THEME-02, THEME-03, THEME-04, THEME-05, THEME-06, THEME-07, THEME-08, THEME-09
**Success Criteria** (what must be TRUE):
  1. Every color in the app derives from CSS custom properties defined in @theme -- no hardcoded hex values in component files
  2. No per-type rainbow colors exist anywhere -- TYPE_PALETTE, getTypeColor, and accentColor fully removed
  3. The app uses warm neutral tones (#111, #1a1a territory) with zero blue tint
  4. Cards display as elevated solid surfaces with bottom-border headers and 1px section separators
  5. Dimension edges are muted by default (~0.35 opacity) and vivid on hover/select
  6. Editor syntax highlighting uses muted/desaturated colors
  7. Toolbar is docked to right side as vertical bar
  8. All text uses monospace font, Tailwind type scale levels only
**Plans**: 4 plans

Plans:
- [ ] 03-01-PLAN.md -- Token foundation: warm @theme palette, eliminate blueprint const, remove TYPE_PALETTE/getTypeColor/accentColor
- [ ] 03-02-PLAN.md -- Card, canvas, edge restyle: solid surfaces, warm dot grid, muted edges, remaining surfaces
- [ ] 03-03-PLAN.md -- Editor muted theme, right-docked toolbar, inspector/command palette warm restyle
- [ ] 03-04-PLAN.md -- Visual verification checkpoint (human-verify)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Core Pipeline | 4/4 | Complete    | 2026-02-22 |
| 2. Interaction & Polish | 0/7 | In progress | - |
| 3. Visual Refinement | 0/4 | Not started | - |

### Phase 4: when hovering permissions or nodes, the highlighted nodes should be moved closer together, the dimmed nodes stay semi transparent in the background

**Goal:** [To be planned]
**Depends on:** Phase 3
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 4 to break down)
