---
phase: 05-gap-closure
plan: 01
subsystem: ui
tags: [react-flow, elk, edges, breadcrumb]

requires:
  - phase: 03-visual-refinement
    provides: restyled cards with shifted handle positions
provides:
  - Edge arrows visually connect flush to card row handles
  - Breadcrumb hidden from UI render tree
  - Explicit port Y-positions in ELK layout matching TypeCardNode CSS
affects: []

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - src/canvas/edges/DimensionEdge.tsx
    - src/canvas/nodes/TypeCardNode.tsx
    - src/layout/elk-layout.ts
    - src/App.tsx

key-decisions:
  - "Compute per-row Y centers in ELK matching TypeCardNode CSS constants (header 33px, row 20px, 1px borders)"
  - "Proportional scaling of estimated positions to measured height for accuracy"
  - "Breadcrumb kept as file but removed from App.tsx render tree for potential Phase 4 use"

patterns-established: []

requirements-completed: [INT-05]

duration: 8min
completed: 2026-02-23
---

# Plan 05-01: Edge Arrow Alignment & Breadcrumb Hide Summary

**Fixed edge arrow connection points shifted by Phase 3 restyle and hidden breadcrumb from UI**

## Performance

- **Duration:** 8 min (across 2 sessions)
- **Tasks:** 2 (1 auto + 1 human-verify)
- **Files modified:** 4

## Accomplishments
- Fixed edge arrowheads connecting flush to card row handles (no visible offset)
- Added explicit port Y-position calculations in ELK layout matching TypeCardNode CSS constants
- Proportional scaling of row positions to measured node height for accuracy
- Removed Breadcrumb component from App.tsx render tree
- Esc key and browser back button navigation preserved (INT-05 satisfied)

## Task Commits

1. **Task 1: Fix edge alignment and hide breadcrumb** - `0b0239d` (fix)
2. **Task 1 follow-up: Explicit port Y-positions** - `185e70a` (fix)

## Files Created/Modified
- `src/canvas/edges/DimensionEdge.tsx` - Adjusted marker refX/refY for alignment
- `src/canvas/nodes/TypeCardNode.tsx` - Handle positioning refinement
- `src/layout/elk-layout.ts` - Added per-row Y center computation with proportional scaling
- `src/App.tsx` - Removed Breadcrumb import and render

## Decisions Made
- Compute port positions from CSS constants (HEADER_H=33, ROW_H=20) rather than DOM measurement
- Scale estimated positions proportionally to actual measured height

## Deviations from Plan
- Added explicit port Y-position computation (not in original plan) for more accurate alignment

## Issues Encountered
None

## User Setup Required
None

## Next Phase Readiness
- Phase 5 complete — all audit gaps closed
- Codebase ready for v1.0 milestone completion

---
*Phase: 05-gap-closure*
*Completed: 2026-02-23*
