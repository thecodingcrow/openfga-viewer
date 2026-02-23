---
phase: 02-interaction-polish
plan: 02
subsystem: ui
tags: [zustand, navigation, browser-history, bfs, state-management]

# Dependency graph
requires:
  - phase: 01-core-pipeline
    provides: "BFS traversal functions (traceUpstream, traceDownstream), parser, type system"
provides:
  - "NavigationFrame type for subgraph drill-in/out stack"
  - "SelfReferencingDimension type and detection function"
  - "Navigation stack state machine in ViewerStore"
  - "Card collapse and dimmed rows toggle state"
  - "Recently visited node tracking (last 5)"
  - "Browser history pushState integration for back-button"
affects: [02-03, 02-04, 02-05]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Navigation stack pattern for subgraph drill-in/out", "Browser history pushState for SPA navigation", "startTransition wrapping for navigation actions"]

key-files:
  created: []
  modified: ["src/types.ts", "src/graph/traversal.ts", "src/store/viewer-store.ts"]

key-decisions:
  - "Navigation stack stores full NavigationFrame objects with pre-computed Sets for visibleTypeIds and relevantRowIds"
  - "popSubgraph does NOT call history.back() -- it is called BY the popstate handler to avoid circular history manipulation"
  - "jumpToLevel does NOT manipulate browser history -- the caller handles it"
  - "Self-referencing dimensions detected via TTU edge self-loops (source type === target type)"

patterns-established:
  - "NavigationFrame: immutable frame with pre-computed Sets created once per navigation action"
  - "Browser history: pushState on drill-in only, popstate handler calls store actions (not vice versa)"
  - "startTransition wrapping for all navigation actions to avoid blocking UI"

requirements-completed: [INT-03, INT-04, INT-05, INT-06, PATH-03]

# Metrics
duration: 3min
completed: 2026-02-22
---

# Phase 2 Plan 02: Navigation Stack Store Summary

**Zustand navigation stack with BFS subgraph computation, card collapse state, browser history pushState, and self-referencing dimension detection**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-22T06:30:51Z
- **Completed:** 2026-02-22T06:34:07Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- NavigationFrame and SelfReferencingDimension types defined in src/types.ts
- detectSelfReferencingDimensions function identifies TTU self-loop patterns in graph edges
- Full navigation stack state machine in ViewerStore with navigateToSubgraph, popSubgraph, jumpToLevel
- Card collapse toggle, dimmed rows toggle, and recently visited tracking (last 5, deduplicated)
- Browser history pushState integration on drill-in for back-button support
- parse() resets navigation state and computes self-referencing dimensions on re-parse

## Task Commits

Each task was committed atomically:

1. **Task 1: NavigationFrame type and self-referencing dimension detection** - `e9f61bc` (feat)
2. **Task 2: Navigation stack store, collapse state, and browser history integration** - `7a69274` (feat)

## Files Created/Modified
- `src/types.ts` - Added NavigationFrame and SelfReferencingDimension interfaces; removed deprecated permissionsOnly filter
- `src/graph/traversal.ts` - Added detectSelfReferencingDimensions function; simplified applyFilters
- `src/store/viewer-store.ts` - Extended ViewerStore with navigation stack, collapse, dimmed rows, recently visited, self-referencing dimensions, and all navigation actions

## Decisions Made
- NavigationFrame stores pre-computed Sets (visibleTypeIds, relevantRowIds) created once per navigation action for stable references
- popSubgraph does NOT manipulate browser history -- it is designed to be called BY the popstate handler to avoid the anti-pattern of circular history manipulation
- jumpToLevel similarly does NOT touch history -- the breadcrumb click handler manages history externally
- Self-referencing dimensions use TTU edge self-loops (source type === target type) grouped by tuplesetRelation

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Navigation stack state machine complete, ready for UI integration in Plans 02-03 (TypeCardNode subgraph drill) and 02-04 (Breadcrumb, browser history wiring)
- collapsedCards state ready for card collapse UI in Plan 02-03
- selfReferencingDimensions ready for tooltip rendering in Plan 02-05

## Self-Check: PASSED

- All 3 modified files exist on disk
- Commit e9f61bc (Task 1) found in git log
- Commit 7a69274 (Task 2) found in git log

---
*Phase: 02-interaction-polish*
*Completed: 2026-02-22*
