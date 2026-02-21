# OpenFGA Viewer — Visual Overhaul

## What This Is

A browser-based graph visualization tool for OpenFGA authorization models. Users paste or import FGA DSL, and the tool renders an interactive directed graph showing how types, relations, and permissions connect — making authorization models explorable instead of just readable. The graph parsing and data model are correct; the visual layer (layout, edge routing, interaction) needs a ground-up rethink.

## Core Value

The graph must be immediately readable — a user looking at it should see how access flows top-down through types, relations, and permissions without untangling spaghetti edges or guessing what connects to what.

## Requirements

### Validated

- ✓ FGA DSL parsing into AuthorizationGraph — existing (`src/parser/`)
- ✓ CodeMirror editor with FGA syntax highlighting — existing (`src/editor/`)
- ✓ Zustand state management with two stores (viewer + hover) — existing (`src/store/`)
- ✓ React Flow canvas with custom node components (TypeNode, RelationNode, PermissionNode) — existing (`src/canvas/`)
- ✓ Custom edge components (DirectEdge, ComputedEdge, TuplesetDepEdge) — existing (`src/canvas/edges/`)
- ✓ Graph traversal algorithms (neighborhood, path finding, TTU expansion) — existing (`src/graph/`)
- ✓ Dark blueprint theme with type-based coloring — existing (`src/theme/`)
- ✓ Toolbar with command palette (Cmd+K) — existing (`src/toolbar/`)
- ✓ Legend panel — existing (`src/legend/`)
- ✓ File import (drag-and-drop + file picker) — existing
- ✓ localStorage persistence for FGA source and editor width — existing
- ✓ Compound nodes (types as containers for relations/permissions) — existing
- ✓ TTU edges in graph model for hover expansion engine — existing

### Active

- [ ] Clean, readable compound node layout (relations band top, permissions band bottom)
- [ ] Untangled edge routing with minimal crossings
- [ ] Cross-compound edges visually distinct from internal edges
- [ ] Path tracing: upstream for permissions, downstream for relations
- [ ] Compound node participation in path tracing
- [ ] Type filtering (show/hide specific types)
- [ ] Focus mode (click node to see its neighborhood)
- [ ] Layout direction toggle (TB/LR) that actually works
- [ ] Hover interaction that highlights relevant paths via TTU engine

### Out of Scope

- Backend/API integration — this is a client-only tool
- Real-time collaboration — single-user tool
- TTU edge rendering — intentionally hidden, used only as path tracing engine
- Mobile/touch support — desktop tool with mouse interaction
- Test suite — important but separate concern from the visual overhaul
- CI/CD pipeline — separate concern
- Accessibility (a11y) — future milestone

## Context

**Current state:** The graph data model correctly represents the OpenFGA spec. All visual features (filtering, focus mode, layout direction, path tracing) exist in code but are broken or legacy. The 3-pass ELK layout system (hierarchical → grid redistribution → root repack) produces tangled edges and poorly ordered compound children.

**Key technical facts:**
- ELK's `elk.bundled.js` (1.6MB GWT-transpiled) runs its own internal Web Worker. Cannot be wrapped in a custom Vite worker.
- Layout results are LRU-cached (5 entries) keyed on direction + node/edge IDs.
- Edge components fall back to React Flow's `getSmoothStepPath` when ELK routes are unavailable.
- TTU edges are filtered at `toFlowElements()` — never rendered. They drive `expandViaTtu()` BFS for hover expansion.
- The default model in the repo is a real business case, complex enough for battle testing.

**Edge component duplication:** DirectEdge, ComputedEdge, and TuplesetDepEdge are near-identical (28 lines each). Should be consolidated.

## Constraints

- **Tech stack**: React 19, React Flow v12, elkjs, Zustand 5, Vite 7, TypeScript strict — no major framework changes
- **ELK bundled**: Must use `elk.bundled.js` directly on main thread — Vite breaks nested Worker constructor if wrapped
- **Browser-only**: No backend, no build-time preprocessing for layout
- **TTU edges**: Must remain hidden but functional as path tracing engine

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Rethink ELK layout strategy completely | Current 3-pass system produces tangled results and is fragile | — Pending |
| Relations top, permissions bottom in compounds | Matches mental model of access flowing downward | — Pending |
| Cross-compound edges get distinct visual style | Helps distinguish type-level relationships from internal structure | — Pending |
| Directional path tracing (upstream perms, downstream rels) | Matches how users reason about access: "where does this come from?" vs "what does this enable?" | — Pending |
| Priority order: layout → edges → exploration | Layout is foundational; edges depend on positions; exploration depends on both | — Pending |

---
*Last updated: 2026-02-21 after initialization*
