# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** The graph must be immediately readable -- a user looking at it should see how access flows through types, relations, and permissions without untangling spaghetti edges or guessing what connects to what.
**Current focus:** Phase 1: Core Pipeline

## Current Position

Phase: 1 of 2 (Core Pipeline)
Plan: 3 of 4 in current phase
Status: Executing
Last activity: 2026-02-22 -- Completed 01-03 (ELK Layout & FgaGraph)

Progress: [██████░░░░] 38%

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: 4min
- Total execution time: 0.2 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-core-pipeline | 3 | 12min | 4min |

**Recent Trend:**
- Last 5 plans: 01-01 (4min), 01-02 (3min), 01-03 (5min)
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

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-02-22
Stopped at: Completed 01-03-PLAN.md
Resume file: None
