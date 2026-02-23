# OpenFGA Viewer

## What This Is

A browser-based graph visualization tool for OpenFGA authorization models. Users paste FGA DSL into a CodeMirror editor, and the tool renders an interactive directed graph showing how types, relations, and permissions connect as ERD schema cards with dimension-colored edges. Supports subgraph exploration, fuzzy search, card collapse, and an inspect tree panel — all in a warm dark HUD aesthetic.

## Core Value

The graph must be immediately readable — a user looking at it should see how access flows through types, relations, and permissions without untangling spaghetti edges or guessing what connects to what.

## Requirements

### Validated

- ✓ ERD schema cards with binding/relation/permission sections — v1.0
- ✓ Dimension detection from TTU tupleset patterns with colorblind-safe edge coloring — v1.0
- ✓ 1-pass flat ELK layout with orthogonal routing (TB/LR toggle) — v1.0
- ✓ Row-level hover highlighting (upstream from permissions, downstream from headers) — v1.0
- ✓ Subgraph exploration with click navigation and animated transitions — v1.0
- ✓ Browser history integration (Esc, back button, breadcrumb) — v1.0
- ✓ Card collapse via double-click with re-layout — v1.0
- ✓ Command palette (Cmd+K) with Fuse.js fuzzy search and grouped results — v1.0
- ✓ Interactive tree-view inspect panel with hover-to-highlight and re-rooting — v1.0
- ✓ Self-referencing dimension tooltips on binding rows — v1.0
- ✓ Warm dark HUD design language via CSS custom property token system — v1.0
- ✓ Solid surface cards with section separators, muted edges with hover vivid — v1.0
- ✓ Muted editor syntax highlighting, all-monospace typography — v1.0
- ✓ FGA DSL parsing into AuthorizationGraph — pre-v1.0
- ✓ CodeMirror editor with FGA syntax highlighting — pre-v1.0
- ✓ Zustand state management (viewer-store + hover-store) — pre-v1.0
- ✓ File import (drag-and-drop + file picker) — pre-v1.0
- ✓ localStorage persistence for FGA source — pre-v1.0

### Active

(None — define with `/gsd:new-milestone`)

### Out of Scope

- Backend/API integration — client-only tool, paste and explore
- Real-time collaboration — single-user tool
- TTU edge rendering — intentionally hidden, drives dimension model
- Mobile/touch support — desktop tool with mouse interaction
- Test suite — separate concern
- CI/CD pipeline — separate concern
- Accessibility (a11y) — future milestone
- Graph editing (visual authoring) — conflicts with paste-and-explore UX
- Path tracing expression highlight (PATH-01) — store machinery exists but UI not needed for v1
- Binding row bridge highlight (PATH-02) — depends on PATH-01

## Context

**Shipped v1.0** with 4,787 LOC TypeScript/TSX/CSS across 29 source files.
Tech stack: React 19, React Flow v12, elkjs, Zustand 5, CodeMirror 6, Tailwind CSS v4, Vite 7, Fuse.js.

The entire visualization pipeline was rebuilt from scratch in v1.0 — compound nodes replaced with flat ERD cards, 3-pass ELK replaced with 1-pass flat layout, all old node/edge components deleted. The parser (`src/parser/`) and editor (`src/editor/`) were preserved unchanged.

**Unplanned future work:** Phase 4 (hover focus layout — move highlighted nodes closer together during hover, dim non-highlighted nodes in background).

## Constraints

- **Tech stack**: React 19, React Flow v12, elkjs, Zustand 5, Vite 7, TypeScript strict — no major framework changes
- **ELK bundled**: Must use `elk.bundled.js` directly on main thread — Vite breaks nested Worker constructor if wrapped
- **Browser-only**: No backend, no build-time preprocessing for layout
- **TTU edges**: Must remain hidden but functional as dimension model engine

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| ERD schema cards replace compound nodes | One React Flow node per type, simpler layout, cleaner edges | ✓ Good |
| Dimensions auto-detected from TTU patterns | No manual config, colorblind-safe categorical palette | ✓ Good |
| 1-pass flat ELK replaces 3-pass compound layout | Simpler, no route invalidation, faster | ✓ Good |
| Same-card edges rendered as expression text | Reduces edge clutter, expressions more readable | ✓ Good |
| No backward compatibility — greenfield rebuild | Faster development, cleaner architecture | ✓ Good |
| Inline SVG markers per edge | Per-edge color matching without shared defs | ✓ Good |
| Overlay layout with floating toolbar | Canvas fills viewport, panels float on top, no resize | ✓ Good |
| NavigationFrame with pre-computed Sets | Stable references for Zustand selectors, no re-render churn | ✓ Good |
| Fuse.js for command palette search | Fuzzy matching with configurable thresholds and key weights | ✓ Good |
| CSS custom property token system | All colors via @theme, no hardcoded hex in components | ✓ Good |
| PATH-01, PATH-02 dropped from v1 | Store machinery exists but UI not needed — revisit if users request | — Deferred |
| Explicit port Y-positions in ELK layout | Match TypeCardNode CSS constants for accurate edge alignment | ✓ Good |

---
*Last updated: 2026-02-23 after v1.0 milestone*
