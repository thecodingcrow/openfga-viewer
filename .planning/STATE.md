# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** The graph must be immediately readable -- a user looking at it should see how access flows through types, relations, and permissions without untangling spaghetti edges or guessing what connects to what.
**Current focus:** Phase 3: Visual Refinement (verification pending)

## Current Position

Phase: 3 of 3 (Visual Refinement)
Plan: 4 of 4 in current phase (human-verify pending)
Status: In Progress
Last activity: 2026-02-22 - Completed plans 03-01, 03-02, 03-03 (token foundation, card/canvas/edge restyle, editor/toolbar/inspector restyle)

Progress: [██████████████████████████] 96%

## Performance Metrics

**Velocity:**
- Total plans completed: 10
- Average duration: 3min
- Total execution time: 0.57 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-core-pipeline | 4 | 16min | 4min |
| 02-interaction-polish | 6 | 18min | 3min |

**Recent Trend:**
- Last 5 plans: 02-02 (3min), 02-03 (4min), 02-04 (2min), 02-05 (3min), 02-06 (4min)
- Trend: Stable

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: ERD schema cards replace compound nodes -- each type is one React Flow node
- [Roadmap]: Dimensions auto-detected from TTU tupleset patterns, not manually configured
- [Roadmap]: 1-pass flat ELK replaces 3-pass compound layout -- simpler, no route invalidation
- [Roadmap]: Same-card edges (computed, tupleset-dep) rendered as expression text, not edges
- [Roadmap]: No backward compatibility -- delete old pipeline, build new. Greenfield approach.
- [01-01]: Dimension detection as separate layer (src/dimensions/) not embedded in parser
- [01-01]: String transformation for expressions rather than AST-level access
- [01-01]: Old edge colors removed from blueprint immediately (expected breakage in old files)
- [01-02]: Inline SVG markers per edge instead of shared MarkerType defs for per-edge color matching
- [01-02]: DimensionEdgeWithMarker wrapper pattern separates marker definition from edge rendering
- [01-02]: Section-based rendering in TypeCardNode — groups rows by section, skips empty sections
- [01-03]: Flat ELK layout with no hierarchy -- every card is root-level node with FIXED_ORDER ports
- [01-03]: Port sides match direction: TB uses WEST/EAST, LR uses NORTH/SOUTH
- [01-03]: Edge source/target must be card type names (not AuthorizationNode IDs) for React Flow node matching
- [01-03]: Old pipeline files deleted early (Rule 3) -- Plan 04 should note these are already gone
- [01-04]: Row-level hover events from TypeCardNode, not FgaGraph node-level callbacks
- [01-04]: Pre-computed highlight sets in hover-store avoid per-component BFS recomputation
- [01-04]: Memoized RowItem component prevents unnecessary re-renders on hover
- [01-04]: Dimensions computed in viewer-store parse() for store-level access
- [02-01]: Overlay layout over flex-row: canvas fills viewport, editor/toolbar float on top
- [02-01]: CSS transform translateX for editor slide vs width animation: smoother, no canvas resize
- [02-01]: Fixed 480px editor width instead of resizable: overlays don't need resize
- [02-01]: Pill shape toolbar (border-radius: 9999px) at top-center for floating HUD look
- [02-02]: NavigationFrame stores pre-computed Sets (visibleTypeIds, relevantRowIds) for stable references
- [02-02]: popSubgraph does NOT manipulate browser history -- called BY the popstate handler
- [02-02]: Self-referencing dimensions detected via TTU edge self-loops (source type === target type)
- [02-03]: 250ms click delay to resolve single-click vs double-click conflict on card header
- [02-03]: Module-level isTransitioning flag (not Zustand state) avoids re-renders on transition start/end
- [02-03]: Edge transition opacity from FgaGraph style prop overrides DimensionEdge hover opacity
- [02-03]: Overview return resets layoutDone and rebuilds from full initialNodes/initialEdges
- [02-04]: Breadcrumb click handlers call jumpToLevel AND window.history.go to keep store and browser history in sync
- [02-04]: Esc key priority chain: close search > pop subgraph > do nothing
- [02-04]: Popstate handler uses empty deps array with getState() for stable reference, no circular history manipulation
- [02-05]: Fuse.js threshold 0.4 balances fuzzy tolerance vs precision for abbreviated input
- [02-05]: Search key weights: fullId 2x, type/relation 1.5x, definition 0.5x for intuitive ranking
- [02-05]: Flat index tracking with const capture for correct onMouseEnter closure binding in grouped results
- [02-05]: Group headers only shown during active search, hidden for recently visited list
- [02-06]: Sidebar/panel icon for inspect toggle to avoid confusion with search magnifying glass
- [02-06]: 320px fixed-width panel overlays canvas (no resize) per locked design decision
- [02-06]: Local expand state (Set in component) not Zustand since expand/collapse is ephemeral UI state
- [02-06]: Subgraph tree shows only relevant rows for focused view
- [02-06]: Tree nodes navigate by section: types downstream, permissions/relations upstream
- [quick-2]: panelOpen + panelTab replaces editorOpen/inspectOpen: simpler state, one toggle controls visibility
- [quick-2]: setPanelTab auto-opens panel: switching tab always ensures panel is visible
- [quick-2]: InspectPanel refactored to content-only export: EditorPanel hosts the shell/tabs
- [quick-3]: Removed inline shortcut badges from toolbar; shortcuts preserved in title tooltips
- [quick-3]: Inactive tab color uses nodeBody (#94a3b8) instead of muted (#64748b) for better contrast
- [quick-4]: Reusable .scrollbar-dark CSS class instead of inline styles for dark scrollbar theming
- [quick-4]: flex-1 min-w-0 truncation pattern replaces fixed maxWidth:140 for responsive expression truncation
- [quick-5]: Portal-based TruncationTooltip into document.body to escape overflow:hidden clipping
- [quick-5]: Truncation detection via scrollWidth > clientWidth — no tooltip for non-truncated text
- [quick-5]: No stopPropagation on tooltip handlers — row hover highlighting preserved

### Roadmap Evolution

- Phase 3 added: Visual Refinement — replace AI-generated aesthetic with polished devtool/HUD design language
- Phase 4 added: Hover focus layout — move highlighted nodes closer together, dim non-highlighted nodes in background

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 1 | Fix subgraph BFS to interleave cross-card and intra-card traversal so inherited permissions appear | 2026-02-22 | cc55ab8 | [1-fix-subgraph-bfs-to-interleave-cross-car](./quick/1-fix-subgraph-bfs-to-interleave-cross-car/) |
| 2 | Move toolbar to bottom, doubled size, shared tabbed panel | 2026-02-22 | 404b9a9 | [2-move-toolbar-to-bottom-doubled-size-shar](./quick/2-move-toolbar-to-bottom-doubled-size-shar/) |
| 3 | Fix toolbar sizing/borders and EditorPanel tab visibility | 2026-02-22 | 81d2a1a | [3-fix-toolbar-sizing-borders-and-merge-edi](./quick/3-fix-toolbar-sizing-borders-and-merge-edi/) |
| 4 | Fix inspector scrollbar styling and expression overflow | 2026-02-22 | feb4903 | [4-fix-inspector-scrollbar-styling-and-expr](./quick/4-fix-inspector-scrollbar-styling-and-expr/) |
| 5 | Add styled hover tooltips to truncated expressions | 2026-02-22 | 9f058e1 | [5-add-styled-hover-tooltips-to-truncated-e](./quick/5-add-styled-hover-tooltips-to-truncated-e/) |

## Session Continuity

Last session: 2026-02-22
Stopped at: Completed quick-5-PLAN.md (styled hover tooltips for truncated expressions)
Resume file: None
