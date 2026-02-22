# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** The graph must be immediately readable -- a user looking at it should see how access flows through types, relations, and permissions without untangling spaghetti edges or guessing what connects to what.
**Current focus:** Phase 2: Interaction & Polish

## Current Position

Phase: 2 of 2 (Interaction & Polish)
Plan: 1 of 7 in current phase
Status: In Progress
Last activity: 2026-02-22 -- Completed 02-01 (HUD Theme & Layout)

Progress: [█████████████] 55%

## Performance Metrics

**Velocity:**
- Total plans completed: 5
- Average duration: 4min
- Total execution time: 0.30 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-core-pipeline | 4 | 16min | 4min |
| 02-interaction-polish | 1 | 2min | 2min |

**Recent Trend:**
- Last 5 plans: 01-02 (3min), 01-03 (5min), 01-04 (4min), 02-01 (2min)
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

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-02-22
Stopped at: Completed 02-01-PLAN.md
Resume file: None
