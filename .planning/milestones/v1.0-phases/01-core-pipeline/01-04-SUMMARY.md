---
phase: 01-core-pipeline
plan: 04
subsystem: ui
tags: [zustand, hover, bfs, traversal, react-flow, opacity, dimming]

# Dependency graph
requires:
  - phase: 01-core-pipeline/03
    provides: "FgaGraph wired to TypeCardNode + DimensionEdge, flat ELK layout, old pipeline deleted"
provides:
  - "Row-level hover highlighting with upstream/downstream BFS path computation"
  - "Hover-aware TypeCardNode with card dimming and row tinting"
  - "Hover-aware DimensionEdge with opacity dimming"
  - "Dimensions state in viewer-store computed at parse time"
  - "All old pipeline files confirmed deleted, clean build/lint"
affects: [02-interaction-polish]

# Tech tracking
tech-stack:
  added: []
  patterns: [row-level-hover-bfs, store-driven-dimming, memo-row-component]

key-files:
  created: []
  modified:
    - src/graph/traversal.ts
    - src/store/hover-store.ts
    - src/store/viewer-store.ts
    - src/canvas/nodes/TypeCardNode.tsx
    - src/canvas/edges/DimensionEdge.tsx
    - src/canvas/FgaGraph.tsx
    - src/index.css

key-decisions:
  - "Row-level hover events from TypeCardNode (not FgaGraph node-level callbacks)"
  - "Pre-computed highlight sets in hover-store avoid recomputation per component"
  - "Memoized RowItem component prevents unnecessary re-renders on hover"
  - "Dimensions computed in viewer-store parse() for store-level access"

patterns-established:
  - "Hover BFS: traceUpstream follows cross-card edges backward, traceDownstream follows forward from all type members"
  - "Card participation check: card participates if any row or type ID is in highlighted sets"
  - "Dimming convention: 0.25 opacity for non-participating cards, 0.08 for non-participating edges"

requirements-completed: [INT-01, INT-02]

# Metrics
duration: 4min
completed: 2026-02-22
---

# Phase 1 Plan 04: Row-Level Hover Highlighting & Old Pipeline Cleanup Summary

**Row-level BFS hover highlighting (upstream from permission rows, downstream from card headers) with pre-computed highlight sets, card/edge dimming at 120ms transitions, and confirmed clean build with no old pipeline remnants**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-22T01:16:05Z
- **Completed:** 2026-02-22T01:20:38Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Bidirectional hover exploration: permission rows trace upstream dependencies, card headers trace downstream consumers
- Pre-computed highlight sets in hover-store eliminate per-component BFS recomputation
- Non-participating elements dim smoothly (cards to 25%, edges to 8%) with 120ms transitions
- Participating rows get subtle cyan tint for visual emphasis
- Dimensions state added to viewer-store for store-level access
- Confirmed all 8 old pipeline files already deleted, zero dangling imports, clean build and lint

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement row-level hover highlighting with BFS traversal** - `e9683a3` (feat)
2. **Task 2: Delete old pipeline files and verify clean build** - no commit needed (verification only, old files already deleted by Plan 03)

## Files Created/Modified
- `src/graph/traversal.ts` - Added traceUpstream and traceDownstream BFS functions for row-level hover
- `src/store/hover-store.ts` - Complete rewrite: row-level hover model with pre-computed highlight sets
- `src/store/viewer-store.ts` - Added dimensions state computed during parse()
- `src/canvas/nodes/TypeCardNode.tsx` - Hover awareness: card dimming, row tinting, mouse event handlers, memoized RowItem
- `src/canvas/edges/DimensionEdge.tsx` - Hover-based opacity dimming from hover-store
- `src/canvas/FgaGraph.tsx` - Removed old node-level hover handlers, added clearHover to pane click
- `src/index.css` - Tuned transitions to 120ms ease-out for fast hover feedback

## Decisions Made
- Hover events fire from within TypeCardNode (row-level mouse handlers) rather than from FgaGraph node-level callbacks -- this enables precise row identification for BFS
- Highlight sets (nodeIds, edgeIds, rowIds) are computed once in the store on hover start and consumed reactively by all card/edge components via individual Zustand selectors
- RowItem extracted as a separate memoized component to prevent re-renders of non-hovered rows during hover state changes
- Dimensions computed in viewer-store's parse() method alongside nodes/edges for store-level access (toFlowElements also computes them independently for its pipeline)

## Deviations from Plan

None - plan executed exactly as written. Task 2's file deletions had already been completed by Plan 03, as documented in the important_context. Verification confirmed all 8 files absent and zero dangling imports.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 1 is now complete: all 4 plans executed successfully
- The full new pipeline is operational: FGA DSL -> parser -> store -> filters -> toFlowElements -> ELK layout -> React Flow render -> hover exploration
- Phase 2 (Interaction & Polish) can proceed to add subgraph exploration, dimension toggles, filtering, and command palette

---
*Phase: 01-core-pipeline*
*Completed: 2026-02-22*
