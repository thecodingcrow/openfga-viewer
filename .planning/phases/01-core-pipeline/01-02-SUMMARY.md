---
phase: 01-core-pipeline
plan: 02
subsystem: ui
tags: [react-flow, erd-card, custom-node, custom-edge, dimension-edge, schema-card, fga-to-flow]

# Dependency graph
requires:
  - phase: 01-core-pipeline/01
    provides: "Dimension detection, edge classification, expression transformation, palette, SchemaCard/CardRow types"
provides:
  - "TypeCardNode — ERD schema card React Flow custom node"
  - "DimensionEdge — universal edge component for all cross-card edges"
  - "Rewritten toFlowElements() that groups nodes by type into cards"
  - "Dimensions Map returned from toFlowElements for downstream hover use"
affects: [01-03, 01-04]

# Tech tracking
tech-stack:
  added: []
  patterns: [erd-card-node, dimension-edge, card-based-flow-conversion]

key-files:
  created:
    - src/canvas/nodes/TypeCardNode.tsx
    - src/canvas/edges/DimensionEdge.tsx
  modified:
    - src/canvas/fgaToFlow.ts

key-decisions:
  - "Inline SVG markers per edge instead of shared React Flow MarkerType defs — ensures each edge arrowhead matches its stroke color"
  - "DimensionEdgeWithMarker wrapper pattern — separates marker definition from edge rendering for clarity"
  - "Section-based rendering in TypeCardNode — groups rows by section, renders conditionally (skip empty sections)"

patterns-established:
  - "ERD card node: single React Flow node per FGA type with per-row Handle pairs"
  - "Handle ID convention: {nodeId}__header_target/source for card-level, {rowId}__target/source for row-level"
  - "Edge data shape: classification + dimensionColor + elkRoute + opacity for hover system"
  - "Card-based fgaToFlow: groups by type, classifies children, sorts sections alphabetically"

requirements-completed: [VIZ-01, VIZ-02, VIZ-03, VIZ-08, DATA-03, DATA-04]

# Metrics
duration: 3min
completed: 2026-02-22
---

# Phase 1 Plan 02: Visual Components Summary

**ERD schema card node, universal dimension edge, and card-based flow conversion replacing old compound-node pipeline components**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-22T01:02:52Z
- **Completed:** 2026-02-22T01:06:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- TypeCardNode renders each FGA type as a dark glass ERD card with accent bar, three background-banded sections (bindings/relations/permissions), compact rows with dimension-colored dots, and expression text on permissions
- DimensionEdge renders all cross-card edges with dimension-specific or muted slate colors, thin solid lines, subtle opacity, and per-edge arrowheads
- fgaToFlow completely rewritten to group AuthorizationNodes by type into SchemaCard data, exclude same-card edges, and return a dimensions Map alongside flow elements

## Task Commits

Each task was committed atomically:

1. **Task 1: Create TypeCardNode ERD schema card component** - `5b71ffa` (feat)
2. **Task 2: Create DimensionEdge and rewrite fgaToFlow conversion** - `9b08cc3` (feat)

## Files Created/Modified
- `src/canvas/nodes/TypeCardNode.tsx` - ERD schema card with per-row handles, section banding, dimension-colored binding dots, expression text
- `src/canvas/edges/DimensionEdge.tsx` - Universal edge with ELK route or smooth step fallback, inline SVG markers, dimension/restriction coloring
- `src/canvas/fgaToFlow.ts` - Complete rewrite: card-based conversion grouping nodes by type, cross-card edges only, dimensions Map output

## Decisions Made
- Used inline SVG marker definitions per edge rather than shared MarkerType.ArrowClosed — each edge needs its own arrowhead color matching its stroke color (dimension-colored or slate), and React Flow's shared markers use a single color
- DimensionEdgeWithMarker wrapper pattern keeps marker SVG definition separate from edge path rendering for cleaner component structure
- Section-based rendering in TypeCardNode groups rows by section type and conditionally skips empty sections, avoiding unnecessary DOM elements for types with only bindings or only permissions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused MarkerType import**
- **Found during:** Task 2 (DimensionEdge)
- **Issue:** Plan mentioned MarkerType.ArrowClosed for arrowheads, but implementation uses inline SVG markers instead (necessary for per-edge color matching). The import was left over.
- **Fix:** Removed unused `MarkerType` import from DimensionEdge.tsx
- **Files modified:** src/canvas/edges/DimensionEdge.tsx
- **Verification:** `tsc -b --noEmit` shows no errors in DimensionEdge.tsx
- **Committed in:** 9b08cc3 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Trivial unused import removal. No scope creep.

## Issues Encountered
- Old pipeline files (TypeNode, RelationNode, PermissionNode, useEdgeInteraction, LegendPanel, FgaGraph) now have TypeScript errors due to removed exports (FgaNodeData, old blueprint edge colors, changed toFlowElements signature). This is expected and documented — these files will be rewritten/deleted in Plans 03/04.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- TypeCardNode and DimensionEdge ready for use in Plan 03 (ELK layout with ports)
- toFlowElements returns dimensions Map needed by Plan 04 (hover highlighting)
- FgaGraph.tsx needs rewriting in Plan 03 to use new toFlowElements signature and register new node/edge types

## Self-Check: PASSED

All 3 source files verified present. Both task commits (5b71ffa, 9b08cc3) verified in git log.

---
*Phase: 01-core-pipeline*
*Completed: 2026-02-22*
