---
phase: 01-core-pipeline
verified: 2026-02-22T02:00:00Z
status: passed
score: 10/10 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Hover over a permission row"
    expected: "Upstream cards highlight, non-participating cards dim to ~25% opacity with 120ms transition"
    why_human: "Opacity animation and visual correctness cannot be verified without rendering"
  - test: "Hover over a card header"
    expected: "Downstream consumers highlight; non-participating elements dim to ~8% opacity for edges, ~25% for cards"
    why_human: "Downstream BFS path visual output requires browser rendering"
  - test: "Toggle layout direction TB/LR"
    expected: "Cards re-layout with correct port sides: WEST/EAST for TB, NORTH/SOUTH for LR"
    why_human: "ELK layout correctness requires rendering to verify card positioning and edge routing"
  - test: "MiniMap and Controls render"
    expected: "Dark-themed MiniMap in bottom-right, Controls panel with zoom/fit buttons"
    why_human: "Requires browser rendering"
  - test: "Paste a model with >9 dimensions"
    expected: "Dimensions 10+ use OKLCH golden-angle colors, distinct from the first 9"
    why_human: "Color visual correctness requires rendering"
---

# Phase 1: Core Pipeline Verification Report

**Phase Goal:** The app renders authorization models as ERD schema cards with dimension-colored edges, flat ELK layout, hover highlighting, minimap, and controls -- old compound pipeline fully deleted
**Verified:** 2026-02-22T02:00:00Z
**Status:** PASSED
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|---------|
| 1  | Dimensions auto-detected from TTU tupleset patterns | VERIFIED | `detectDimensions()` in `src/dimensions/detect.ts` groups TTU edges by `tuplesetRelation`, collects binding nodes via `isTuplesetBinding` |
| 2  | Every edge classified as type-restriction or dimension | VERIFIED | `classifyEdges()` splits into `crossCard` (direct+ttu) and `sameCard` (computed+tupleset-dep) arrays |
| 3  | Same-card edges excluded from visual edges | VERIFIED | `fgaToFlow.ts` destructures only `crossCard` from `classifyEdges()`, never iterates `sameCard` edges for React Flow output |
| 4  | Each dimension gets a colorblind-safe color from Paul Tol Muted | VERIFIED | `DIMENSION_PALETTE` has exactly 9 hex colors, `assignDimensionColors()` assigns them alphabetically with OKLCH golden-angle fallback |
| 5  | Type restriction edges use muted slate color | VERIFIED | `TYPE_RESTRICTION_COLOR = "#475569"` imported into `DimensionEdge.tsx`; applied when `classification !== 'dimension'` |
| 6  | Each FGA type renders as a single ERD schema card | VERIFIED | `toFlowElements()` creates one React Flow node (`type: 'typeCard'`) per type, grouping all relations into `SchemaCard.rows` |
| 7  | Graph uses 1-pass flat ELK layout with orthogonal routing | VERIFIED | `elk-layout.ts` uses `elk.algorithm: layered`, `elk.edgeRouting: ORTHOGONAL`, flat graph (`elkChildren` at root level, no compound hierarchy, no `INCLUDE_CHILDREN`) |
| 8  | MiniMap and Controls are present | VERIFIED | `FgaGraph.tsx` imports and renders `<MiniMap>` and `<Controls>` from `@xyflow/react` inside the `<ReactFlow>` component |
| 9  | Hover highlighting with upstream/downstream BFS | VERIFIED | `traceUpstream()` and `traceDownstream()` in `traversal.ts`; `hover-store.ts` pre-computes highlight sets; `TypeCardNode` dims non-participating cards to 0.25, `DimensionEdge` dims non-highlighted edges to 0.08 |
| 10 | Old compound pipeline fully deleted | VERIFIED | `src/canvas/nodes/` contains only `TypeCardNode.tsx`; `src/canvas/edges/` contains only `DimensionEdge.tsx`; no references to `TypeNode`, `RelationNode`, `PermissionNode`, `DirectEdge`, `ComputedEdge`, `TuplesetDepEdge`, `useNodeInteraction`, `useEdgeInteraction`, or old blueprint edge colors (`edgeDirect`/`edgeComputed`/`edgeTuplesetDep`) |

**Score:** 10/10 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/dimensions/detect.ts` | Dimension detection and edge classification | VERIFIED | Exports `detectDimensions`, `classifyEdges`, `transformExpression`; 129 lines, substantive implementation |
| `src/theme/dimensions.ts` | Colorblind-safe dimension palette and color assignment | VERIFIED | Exports `DIMENSION_PALETTE` (9 entries), `TYPE_RESTRICTION_COLOR = "#475569"`, `assignDimensionColors`; 69 lines |
| `src/types.ts` | Dimension and SchemaCard type definitions | VERIFIED | Exports `Dimension`, `EdgeClassification`, `CardRow`, `SchemaCard` interfaces |
| `src/theme/colors.ts` | Updated theme, dimension re-exports | VERIFIED | No `edgeDirect/edgeComputed/edgeTuplesetDep` properties; re-exports `DIMENSION_PALETTE`, `TYPE_RESTRICTION_COLOR`, `assignDimensionColors` from `./dimensions` |
| `src/canvas/nodes/TypeCardNode.tsx` | ERD schema card node component | VERIFIED | Exports `TypeCardNode = memo(TypeCardNodeComponent)`; full implementation with section banding, dimension-colored dots, expression text, hover awareness, hidden Handles |
| `src/canvas/edges/DimensionEdge.tsx` | Universal edge component | VERIFIED | Exports `DimensionEdge = memo(DimensionEdgeWithMarker)`; renders with `TYPE_RESTRICTION_COLOR` or dimension color, ELK route fallback to smooth-step, hover-based opacity dimming |
| `src/canvas/fgaToFlow.ts` | AuthorizationGraph to React Flow elements conversion | VERIFIED | Exports `toFlowElements(graph)`; groups nodes by type, creates `typeCard` nodes, `dimension` edges (cross-card only), returns `{ nodes, edges, dimensions }` |
| `src/layout/elk-layout.ts` | 1-pass flat ELK layout with port-based routing | VERIFIED | Exports `getLayoutedElements`; flat graph construction, FIXED_ORDER port constraints, ORTHOGONAL routing, LRU cache (5 entries); no `INCLUDE_CHILDREN` or compound hierarchy |
| `src/canvas/FgaGraph.tsx` | React Flow orchestration with new node/edge types, MiniMap, Controls | VERIFIED | Registers `nodeTypes = { typeCard: TypeCardNode }` and `edgeTypes = { dimension: DimensionEdge }`; renders `<MiniMap>` and `<Controls>`; calls `getLayoutedElements` after `useNodesInitialized` |
| `src/store/hover-store.ts` | Row-level hover state with BFS path computation | VERIFIED | Exports `useHoverStore`; `setHoveredRow` calls `traceUpstream`, `setHoveredCard` calls `traceDownstream`; pre-computes `highlightedNodeIds`, `highlightedEdgeIds`, `highlightedRowIds` |
| `src/store/viewer-store.ts` | Updated store with dimensions state | VERIFIED | `dimensions: Map<string, Dimension>` field; `parse()` calls `detectDimensions` + `assignDimensionColors` and stores result; error path resets to `new Map()` |
| `src/graph/traversal.ts` | Updated traversal with cross-card BFS functions | VERIFIED | Exports `traceUpstream` (BFS backward on direct+ttu) and `traceDownstream` (BFS forward from all type members); existing functions preserved |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `dimensions/detect.ts` | `types.ts` | `import type { AuthorizationGraph, AuthorizationEdge, Dimension }` | WIRED | Line 8-12 of detect.ts |
| `theme/dimensions.ts` | `types.ts` | `import type { Dimension }` | WIRED | Line 9 of dimensions.ts |
| `canvas/fgaToFlow.ts` | `dimensions/detect.ts` | `import { detectDimensions, classifyEdges, transformExpression }` | WIRED | Line 16 of fgaToFlow.ts; all three functions called in `toFlowElements()` |
| `canvas/fgaToFlow.ts` | `theme/dimensions.ts` | `import { assignDimensionColors }` | WIRED | Line 17 of fgaToFlow.ts; called line 45 |
| `canvas/nodes/TypeCardNode.tsx` | `types.ts` | `import type { SchemaCard, CardRow }` | WIRED | Line 3 of TypeCardNode.tsx |
| `canvas/edges/DimensionEdge.tsx` | `theme/dimensions.ts` | `import { TYPE_RESTRICTION_COLOR }` | WIRED | Line 10 of DimensionEdge.tsx; used in stroke color computation |
| `layout/elk-layout.ts` | `types.ts` | `import type { SchemaCard, CardRow }` | WIRED | Line 5 of elk-layout.ts; `card.rows` read to build ELK ports |
| `canvas/FgaGraph.tsx` | `nodes/TypeCardNode.tsx` | `nodeTypes = { typeCard: TypeCardNode }` | WIRED | Line 28 of FgaGraph.tsx |
| `canvas/FgaGraph.tsx` | `edges/DimensionEdge.tsx` | `edgeTypes = { dimension: DimensionEdge }` | WIRED | Line 29 of FgaGraph.tsx |
| `canvas/FgaGraph.tsx` | `layout/elk-layout.ts` | `import { getLayoutedElements }` + call | WIRED | Line 22 of FgaGraph.tsx; called at line 82 inside `nodesInitialized` effect |
| `store/hover-store.ts` | `graph/traversal.ts` | `import { traceUpstream, traceDownstream }` | WIRED | Line 3 of hover-store.ts; called at lines 50 and 66 |
| `canvas/nodes/TypeCardNode.tsx` | `store/hover-store.ts` | `import { useHoverStore }` | WIRED | Line 4 of TypeCardNode.tsx; six selectors consumed, three actions called |
| `canvas/edges/DimensionEdge.tsx` | `store/hover-store.ts` | `import { useHoverStore }` | WIRED | Line 11 of DimensionEdge.tsx; `isHoverActive` and `highlightedEdgeIds` consumed |
| `canvas/FgaGraph.tsx` | `store/hover-store.ts` | `clearHover` called on `onPaneClick` | WIRED | Line 36+135 of FgaGraph.tsx |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| DATA-01 | 01-01 | Dimensions auto-detected from TTU tupleset patterns | SATISFIED | `detectDimensions()` groups TTU edges by `tuplesetRelation` |
| DATA-02 | 01-01 | All edges classified as type-restriction or dimension | SATISFIED | `classifyEdges()` produces `crossCard` (direct+ttu) and `sameCard` (computed+tupleset-dep) |
| DATA-03 | 01-01, 01-02 | Same-card dependencies rendered as expression text, not edges | SATISFIED | `fgaToFlow.ts` only iterates `crossCard` for visual edges; `transformExpression()` converts definitions for card display |
| DATA-04 | 01-02 | Schema cards built from auth graph with correct section classification | SATISFIED | `toFlowElements()` classifies nodes into binding/relation/permission sections with alphabetical sort |
| VIZ-01 | 01-02 | Types render as ERD schema cards with binding, relation, permission sections | SATISFIED | `TypeCardNode.tsx` renders three banded sections; confirmed by section grouping in component |
| VIZ-02 | 01-02 | Binding rows show dimension-colored dot indicator | SATISFIED | `RowItemComponent` fills dot with `row.dimensionColor` for binding rows |
| VIZ-03 | 01-02 | Permission rows display readable expressions with `↗dimension` notation | SATISFIED | `transformExpression()` converts `X from Y` to `↗Y.X`; displayed in `row.expression` |
| VIZ-04 | 01-01 | Cross-card edges use dimension-specific colors | SATISFIED | `DimensionEdge` uses `data.dimensionColor` for dimension edges |
| VIZ-05 | 01-01 | Type restriction edges use muted slate styling | SATISFIED | `TYPE_RESTRICTION_COLOR = "#475569"` applied to direct edges in `DimensionEdge` |
| VIZ-06 | 01-03 | 1-pass flat ELK layout with orthogonal edge routing | SATISFIED | `elk-layout.ts` uses layered algorithm with ORTHOGONAL routing, flat node hierarchy |
| VIZ-07 | 01-03 | Layout supports TB and LR direction toggle | SATISFIED | `direction` param toggles `elk.direction` between DOWN/RIGHT; port sides flip between WEST/EAST and NORTH/SOUTH |
| VIZ-08 | 01-02 | Cards use dark glass styling with type-colored accent bar | SATISFIED | `TypeCardNode` applies `rgba(15, 23, 42, 0.85)` background, `blur(8px)`, `3px solid ${d.accentColor}` header border |
| INT-01 | 01-04 | Hovering a permission row highlights upstream feeding paths | SATISFIED | `RowItemComponent.onMouseEnter` calls `setHoveredRow`; `traceUpstream` BFS backward through direct+ttu |
| INT-02 | 01-04 | Hovering a card header highlights downstream enabled paths | SATISFIED | Header `onMouseEnter` calls `setHoveredCard`; `traceDownstream` BFS forward from all type members |
| CTRL-07 | 01-03 | Minimap for graph overview | SATISFIED | `<MiniMap>` rendered in `FgaGraph.tsx` with dark glass styling |
| CTRL-08 | 01-03 | Controls panel for zoom/fit | SATISFIED | `<Controls showInteractive={false}>` rendered in `FgaGraph.tsx` |

All 16 requirements declared across plans 01-01, 01-02, 01-03, 01-04 are SATISFIED.

No orphaned requirements found -- all 16 Phase 1 requirements in REQUIREMENTS.md traceability table are covered by the four plans.

### Anti-Patterns Found

None. Scan across all modified files returned no TODOs, FIXMEs, placeholder returns, empty handlers, or stub implementations.

The `return null` occurrences found are legitimate guard clauses (FgaGraph guards on `hasNodes`, elk-path guards on insufficient points, traversal guards on same start/end node).

### Human Verification Required

The automated checks all pass. The following behaviors require browser rendering to confirm:

**1. Upstream hover highlight**
Test: Hover over a permission row in any card.
Expected: That card and all upstream cards/edges highlight; non-participating cards dim to ~25% opacity, non-participating edges dim to ~8%; transitions animate at 120ms.
Why human: CSS opacity animation and React Flow rendering cannot be verified without a browser.

**2. Downstream hover highlight**
Test: Hover over a card header.
Expected: Downstream consuming cards/edges highlight; non-participating elements dim with the same 120ms transition.
Why human: BFS traversal is verified in code, but path correctness and visual output require rendering.

**3. Layout direction toggle**
Test: Switch TB/LR direction in the toolbar.
Expected: Cards re-layout with correct port sides (WEST/EAST for TB, NORTH/SOUTH for LR); orthogonal edges route correctly.
Why human: ELK layout output and edge routing correctness require visual inspection.

**4. MiniMap and Controls appearance**
Test: Load the app.
Expected: Dark-themed MiniMap in bottom-right corner; Controls panel with zoom-in, zoom-out, fit-view buttons.
Why human: Requires rendering.

**5. Expression transformation in permission rows**
Test: View a model with TTU permissions (e.g., `can_read: can_read from client`).
Expected: Permission row shows `↗client.can_read` notation.
Why human: Requires rendering to confirm text display in card rows.

### Gaps Summary

No gaps. All phase must-haves are verified.

The build passes clean (`tsc -b && vite build` succeeds), lint passes with zero warnings or errors, all 8 old pipeline files are confirmed deleted with zero dangling imports, all 16 requirements have concrete implementation evidence, and all key wiring links are confirmed in actual code (not just documentation).

---
_Verified: 2026-02-22T02:00:00Z_
_Verifier: Claude (gsd-verifier)_
