---
phase: 01-core-pipeline
plan: 03
subsystem: layout
tags: [elk, layout, react-flow, minimap, controls, orthogonal-routing, port-constraints]

# Dependency graph
requires:
  - phase: 01-core-pipeline/02
    provides: "TypeCardNode, DimensionEdge, rewritten toFlowElements with SchemaCard grouping"
provides:
  - "1-pass flat ELK layout with port-based orthogonal routing"
  - "FgaGraph wired to new pipeline (TypeCardNode + DimensionEdge)"
  - "MiniMap and Controls with dark glass styling"
  - "Correct React Flow edge source/target referencing card node IDs"
affects: [01-04]

# Tech tracking
tech-stack:
  added: []
  patterns: [flat-elk-layout, port-based-routing, card-row-handle-mapping]

key-files:
  created: []
  modified:
    - src/layout/elk-layout.ts
    - src/canvas/FgaGraph.tsx
    - src/canvas/fgaToFlow.ts
    - src/legend/LegendPanel.tsx

key-decisions:
  - "Flat ELK layout (no hierarchy) — every card is a root-level node with FIXED_ORDER ports"
  - "Port sides match direction: TB uses WEST/EAST, LR uses NORTH/SOUTH"
  - "Edge routes extracted from ELK sections and attached as elkRoute data for DimensionEdge consumption"
  - "Early deletion of dead old pipeline files (Rule 3) — build could not pass with broken references"

patterns-established:
  - "ELK port ID convention matches Handle IDs: {rowId}__target, {rowId}__source, {nodeId}__header_target/source"
  - "Edge source/target must be card type names (not AuthorizationNode IDs) for React Flow node matching"
  - "MiniMap/Controls positioned as ReactFlow children with dark glass inline styles"

requirements-completed: [VIZ-06, VIZ-07, CTRL-07, CTRL-08]

# Metrics
duration: 5min
completed: 2026-02-22
---

# Phase 1 Plan 03: ELK Layout & FgaGraph Summary

**1-pass flat ELK layout with port-based orthogonal routing, FgaGraph wired to new TypeCardNode/DimensionEdge pipeline, plus MiniMap and Controls**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-22T01:08:51Z
- **Completed:** 2026-02-22T01:13:29Z
- **Tasks:** 2
- **Files modified:** 4 (+ 8 deleted)

## Accomplishments
- ELK layout completely rewritten from 3-pass compound (571 lines) to 1-pass flat (176 lines) with orthogonal edge routing and FIXED_ORDER port constraints matching card row Handle IDs
- FgaGraph registers TypeCardNode and DimensionEdge as sole node/edge types, with MiniMap and Controls for navigation
- Fixed fgaToFlow edge source/target to reference card type names instead of AuthorizationNode IDs (required for React Flow node matching)
- Deleted 8 dead old pipeline files to unblock the build

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite ELK layout to 1-pass flat with ports** - `df1b5f6` (feat)
2. **Task 2: Rewrite FgaGraph with new pipeline, MiniMap, and Controls** - `50242fc` (feat)

## Files Created/Modified
- `src/layout/elk-layout.ts` - Complete rewrite: 1-pass flat ELK with ports, orthogonal routing, LRU cache
- `src/canvas/FgaGraph.tsx` - New pipeline: TypeCardNode + DimensionEdge types, MiniMap, Controls, simplified hover
- `src/canvas/fgaToFlow.ts` - Fixed edge source/target to use card type names instead of full node IDs
- `src/legend/LegendPanel.tsx` - Updated edge section to new classification (type-restriction + dimension)

### Deleted Files
- `src/canvas/nodes/TypeNode.tsx` - Old compound node component
- `src/canvas/nodes/RelationNode.tsx` - Old relation node component
- `src/canvas/nodes/PermissionNode.tsx` - Old permission node component
- `src/canvas/nodes/useNodeInteraction.ts` - Old node interaction hook
- `src/canvas/edges/DirectEdge.tsx` - Old direct edge component
- `src/canvas/edges/ComputedEdge.tsx` - Old computed edge component
- `src/canvas/edges/TuplesetDepEdge.tsx` - Old tupleset dep edge component
- `src/canvas/edges/useEdgeInteraction.ts` - Old edge interaction hook

## Decisions Made
- Flat ELK layout with no hierarchy handling -- every card is a root-level ELK node with ports. This is simpler and eliminates the need for compound node positioning, grid redistribution, and root repack
- Port sides assigned by direction: TB mode uses WEST (target) and EAST (source), LR mode uses NORTH (target) and SOUTH (source) -- matches the orthogonal routing convention
- Edge route extraction skips the old trimPathToHandles logic since ELK now handles port-level routing directly via FIXED_ORDER constraints
- Early deletion of old pipeline files was necessary (Rule 3) because they referenced removed color constants and the build could not pass

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed fgaToFlow edge source/target references**
- **Found during:** Task 1
- **Issue:** fgaToFlow set edge.source/target to AuthorizationNode IDs (e.g., "folder#viewer") but React Flow nodes have id=typeName (e.g., "folder"). React Flow requires source/target to match node IDs.
- **Fix:** Extract type name from AuthorizationNode ID via `edge.source.split('#')[0]` for source/target, keep row-level IDs in sourceHandle/targetHandle
- **Files modified:** src/canvas/fgaToFlow.ts
- **Verification:** `npx tsc --noEmit` passes, edges reference valid card node IDs
- **Committed in:** df1b5f6 (Task 1 commit)

**2. [Rule 3 - Blocking] Deleted dead old pipeline files that break build**
- **Found during:** Task 2
- **Issue:** Old node/edge components (TypeNode, RelationNode, PermissionNode, DirectEdge, ComputedEdge, TuplesetDepEdge) and their hooks referenced removed exports (FgaNodeData, blueprint.edgeDirect, etc.). No file in the new pipeline imports these, but TypeScript compiles all files regardless.
- **Fix:** Deleted 8 dead files. Updated LegendPanel to use TYPE_RESTRICTION_COLOR instead of removed blueprint.edgeDirect/edgeComputed
- **Files modified:** 8 files deleted, src/legend/LegendPanel.tsx updated
- **Verification:** `npm run build` succeeds
- **Committed in:** 50242fc (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes essential for build to pass. The fgaToFlow fix corrects a real bug in the edge-to-node mapping. The old file deletion was pulled forward from Plan 04 because the build was blocked -- Plan 04 should note these files are already gone.

## Issues Encountered
None beyond the deviations documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Full new pipeline is now wired and building: FGA DSL -> parse -> store -> filters -> toFlowElements -> ELK layout -> React Flow render
- Plan 04 (row-level hover highlighting, store updates) can proceed. Note: old pipeline files already deleted in this plan
- App should be visually functional -- cards render at ELK-computed positions with orthogonal edge routing

## Self-Check: PASSED

All 4 modified files verified present. Both task commits (df1b5f6, 50242fc) verified in git log. All 8 deleted files confirmed absent. `npm run build` passes.

---
*Phase: 01-core-pipeline*
*Completed: 2026-02-22*
