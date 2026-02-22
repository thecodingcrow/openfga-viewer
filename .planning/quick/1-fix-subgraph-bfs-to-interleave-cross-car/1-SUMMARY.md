---
phase: quick
plan: 1
subsystem: graph
tags: [bfs, traversal, subgraph-navigation, ttu, dimension-color]

# Dependency graph
requires:
  - phase: 02-interaction-polish
    provides: "Subgraph navigation stack, computeSubgraph, TypeCardNode rendering"
provides:
  - "Unified single-phase BFS in computeSubgraph following all edge types"
  - "TTU dimension color indication on relation/permission rows"
affects: [subgraph-navigation, hover-highlighting, type-card-rendering]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Unified BFS with directional edge matching instead of multi-phase traversal"

key-files:
  created: []
  modified:
    - src/graph/traversal.ts
    - src/types.ts
    - src/canvas/fgaToFlow.ts
    - src/canvas/nodes/TypeCardNode.tsx

key-decisions:
  - "Keep traceUpstream/traceDownstream intact for hover-store (only computeSubgraph changed)"
  - "Downstream BFS seeds from all type rows since no edges connect type node to own rows"
  - "TTU dimension color derived from tuplesetRelation lookup on edge targets"

patterns-established:
  - "Unified BFS: follow all edge types in single queue, direction controls match field"

requirements-completed: []

# Metrics
duration: 2min
completed: 2026-02-22
---

# Quick Task 1: Fix Subgraph BFS Summary

**Unified single-phase BFS in computeSubgraph that interleaves cross-card and intra-card edges, plus colored dot indicators for TTU-inherited rows**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-22T07:39:05Z
- **Completed:** 2026-02-22T07:41:19Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Fixed upstream subgraph navigation to surface TTU-linked type cards (e.g., folder card now appears when tracing upstream from document#can_view)
- Replaced broken two-phase BFS with unified single-phase BFS following all four edge types (direct, ttu, computed, tupleset-dep) in a single queue
- Added ttuDimensionColor field to CardRow and populated it from TTU edge target lookup
- Relation/permission rows targeted by TTU edges now display colored dots matching the dimension color with "Inherited via TTU" tooltip

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix computeSubgraph to use unified single-phase BFS** - `1f2d120` (fix)
2. **Task 2: Add ttuDimensionColor to CardRow and populate it in fgaToFlow** - `4e4825d` (feat)
3. **Task 3: Render ttuDimensionColor dot in TypeCardNode for inherited rows** - `cc55ab8` (feat)

## Files Created/Modified
- `src/graph/traversal.ts` - Replaced two-phase computeSubgraph with unified single-phase BFS
- `src/types.ts` - Added ttuDimensionColor field to CardRow interface
- `src/canvas/fgaToFlow.ts` - Built ttuColorByTarget lookup from TTU edges, populated on relation/permission rows
- `src/canvas/nodes/TypeCardNode.tsx` - Renders colored dot for TTU-inherited rows with tooltip

## Decisions Made
- Keep traceUpstream/traceDownstream intact -- they are used by hover-store for hover highlighting and have different semantics (cross-card edges only)
- Downstream BFS seeds from all type rows because no edges connect a type node (e.g., "document") to its own rows (e.g., "document#viewer") -- direct edges go from referenced types to the relation
- TTU dimension color derived by looking up edge.tuplesetRelation in the dimensions map, matching how dimension edges are colored

## Deviations from Plan

None - plan executed exactly as written (with the critical correction applied from the prompt).

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Subgraph navigation now correctly traverses all edge types
- TTU-inherited rows are visually distinguishable
- No regressions in hover highlighting (traceUpstream/traceDownstream unchanged)

## Self-Check: PASSED

All 4 modified files verified present. All 3 task commits verified (1f2d120, 4e4825d, cc55ab8).

---
*Quick Task: 1*
*Completed: 2026-02-22*
