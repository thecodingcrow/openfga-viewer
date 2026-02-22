---
phase: 02-interaction-polish
plan: 01
subsystem: ui
tags: [react, tailwind, zustand, react-flow, css-transitions, overlay-layout]

# Dependency graph
requires:
  - phase: 01-core-pipeline
    provides: ERD schema cards, dimension edges, TypeCardNode, flat ELK layout
provides:
  - Mustard accent color as primary UI accent
  - HUD panel class with solid dark background
  - Overlay-based layout (canvas full viewport, editor/toolbar overlaid)
  - Floating pill toolbar at top center
  - Editor as slide-out left overlay
  - Restyled MiniMap and Controls with HUD aesthetic
  - Dot grid canvas background
affects: [02-02, 02-03, 02-04, 02-05, 02-06, 02-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Overlay layout: canvas fills viewport, panels overlay with z-index stacking"
    - "CSS transform transitions for panel slide-in/out (no animation libraries)"
    - "HUD aesthetic: solid dark backgrounds rgba(15, 23, 41, 0.95) with blur backdrop"

key-files:
  created: []
  modified:
    - src/theme/colors.ts
    - src/index.css
    - src/App.tsx
    - src/toolbar/Toolbar.tsx
    - src/editor/EditorPanel.tsx
    - src/canvas/FgaGraph.tsx
    - src/store/viewer-store.ts
    - src/types.ts
    - src/graph/traversal.ts

key-decisions:
  - "Overlay layout over flex-row: canvas fills viewport, editor/toolbar float on top"
  - "CSS transform translateX for editor slide vs width animation: smoother, no canvas resize"
  - "Fixed 480px editor width instead of resizable: overlays don't need resize since they don't affect canvas"
  - "Pill shape toolbar (border-radius: 9999px) at top-center for floating HUD look"

patterns-established:
  - "HUD panel: use .hud-panel class for all floating panels (solid dark, blur, border, shadow)"
  - "Overlay z-index stacking: z-40 for panels, z-50 for toolbar, z-60 for banners"
  - "Panel slide transitions: transform + transition 250ms ease-out"

requirements-completed: [CTRL-06]

# Metrics
duration: 2min
completed: 2026-02-22
---

# Phase 02 Plan 01: HUD Theme & Layout Summary

**Mustard accent color, overlay-based layout with floating pill toolbar and slide-out editor panel, solid dark HUD aesthetic throughout**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-22T06:31:00Z
- **Completed:** 2026-02-22T06:33:02Z
- **Tasks:** 2
- **Files modified:** 9 (+ 1 deleted)

## Accomplishments
- Mustard accent color (#d4a017) replaces sky blue throughout all UI elements
- Application layout restructured from flex-row split to full-viewport canvas with overlay panels
- Floating pill toolbar at top center with editor toggle (Cmd+E) and search (Cmd+K) buttons
- Editor slides in/out from left edge using CSS transform transitions
- MiniMap and Controls restyled with solid dark HUD background and matching borders
- Dot grid canvas background with muted slate color (#1e3a5c)
- LegendPanel fully deleted with all store/type/filter references cleaned up
- permissionsOnly filter removed from types, store, and traversal logic

## Task Commits

Each task was committed atomically:

1. **Task 1: HUD theme, overlay layout, and toolbar redesign** - `e9f61bc` (feat)
2. **Task 2: Delete LegendPanel and clean up dead references** - `d4c7515` (refactor)

## Files Created/Modified
- `src/theme/colors.ts` - Changed blueprint.accent from #38bdf8 to #d4a017 (mustard)
- `src/index.css` - Updated HUD panel opacity to 0.95, accent CSS variable to mustard
- `src/App.tsx` - Restructured from flex-row to overlay-based stack layout
- `src/toolbar/Toolbar.tsx` - Floating pill at top-center, editor toggle, removed legend/permissions buttons
- `src/editor/EditorPanel.tsx` - Absolute overlay with slide animation (translateX)
- `src/canvas/FgaGraph.tsx` - Restyled MiniMap, Controls, and Background dots
- `src/store/viewer-store.ts` - Removed legendOpen, toggleLegend, permissionsOnly from store
- `src/types.ts` - Removed permissionsOnly from GraphFilters interface
- `src/graph/traversal.ts` - Simplified applyFilters() to type-only filtering
- `src/legend/LegendPanel.tsx` - Deleted (legend replaced by inspect panel in Plan 06)

## Decisions Made
- Overlay layout over flex-row: canvas fills viewport, editor/toolbar float on top with z-index
- CSS transform translateX for editor slide: smoother animation, no canvas resize flicker
- Fixed 480px editor width: overlays don't need resize since they don't affect canvas layout
- Pill shape toolbar at top-center: floating HUD aesthetic matching CONTEXT.md vision

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- HUD visual foundation established for all subsequent Phase 2 plans
- Overlay layout pattern ready for inspect panel (Plan 06) and command palette
- Toolbar extensible for additional buttons (layout direction, etc.)

## Self-Check: PASSED

All created/modified files verified. Both commit hashes (e9f61bc, d4c7515) confirmed in git log. LegendPanel.tsx deletion confirmed. Zero dangling references to deleted code.

---
*Phase: 02-interaction-polish*
*Completed: 2026-02-22*
