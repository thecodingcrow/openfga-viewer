---
phase: 02-interaction-polish
plan: 04
subsystem: ui
tags: [react, zustand, breadcrumb, navigation, browser-history, keyboard-shortcuts]

# Dependency graph
requires:
  - phase: 02-interaction-polish
    plan: 01
    provides: "HUD panel class, overlay layout, accent color"
  - phase: 02-interaction-polish
    plan: 02
    provides: "NavigationFrame type, navigationStack, popSubgraph, jumpToLevel, browser history pushState"
provides:
  - "Breadcrumb trail component for subgraph navigation context"
  - "Esc key pops one navigation level (priority after search close)"
  - "Browser back button pops navigation via popstate handler"
affects: [02-05, 02-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Popstate handler reads from getState() directly to avoid stale closures"
    - "Breadcrumb click handlers sync browser history with window.history.go()"
    - "Esc key priority chain: close search > pop subgraph > do nothing"

key-files:
  created:
    - src/canvas/Breadcrumb.tsx
  modified:
    - src/App.tsx

key-decisions:
  - "Breadcrumb click handlers call jumpToLevel AND window.history.go to keep store and browser history in sync"
  - "Esc key uses priority chain: search close first, then subgraph pop, avoiding conflicts"
  - "Popstate handler uses empty dependency array with getState() for stable reference"

patterns-established:
  - "Navigation history sync: store actions do NOT manipulate history; UI event handlers do"
  - "Esc key priority chain: most specific action first (search > navigation > nothing)"

requirements-completed: [INT-05]

# Metrics
duration: 2min
completed: 2026-02-22
---

# Phase 02 Plan 04: Breadcrumb & Navigation Wiring Summary

**Breadcrumb trail for subgraph navigation with Esc key pop and browser back button popstate integration**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-22T06:37:19Z
- **Completed:** 2026-02-22T06:39:30Z
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments
- Breadcrumb component renders navigation trail in bottom-left when inside a subgraph
- Each breadcrumb segment is clickable to jump to that navigation level
- Overview button returns to full graph, current level highlighted in accent color
- Esc key pops one navigation level (after search close priority check)
- Browser back button pops navigation via popstate handler without circular history loop

## Task Commits

Each task was committed atomically:

1. **Task 1: Breadcrumb component** - `d97e113` (feat)
2. **Task 2: Wire Breadcrumb into App, Esc key pop, and popstate handler** - `94c72e6` (feat)

## Files Created/Modified
- `src/canvas/Breadcrumb.tsx` - New breadcrumb trail component with clickable segments, accent/muted coloring, browser history sync
- `src/App.tsx` - Added Breadcrumb to layout, extended Esc handler with navigation pop, added popstate listener

## Decisions Made
- Breadcrumb click handlers call both jumpToLevel (store) and window.history.go (browser) to keep state synchronized
- Esc key uses priority chain: close search if open, then pop subgraph if navigated, then do nothing
- Popstate handler uses empty deps array and reads from useViewerStore.getState() to avoid stale closures
- No history manipulation inside popstate handler -- only store updates, preventing circular loops

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Breadcrumb navigation complete, providing visual context for subgraph drill-in/out
- Navigation stack fully wired end-to-end: drill-in (pushState) -> breadcrumb (jumpToLevel + history.go) -> Esc (popSubgraph + history.back) -> browser back (popstate -> jumpToLevel)
- Ready for tooltip/inspect features in Plans 05 and 06

## Self-Check: PASSED

---
*Phase: 02-interaction-polish*
*Completed: 2026-02-22*
