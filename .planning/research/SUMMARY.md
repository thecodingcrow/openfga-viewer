# Project Research Summary

**Project:** OpenFGA Viewer — compound graph visualization for authorization model exploration
**Domain:** Hierarchical compound graph layout + interactive graph exploration
**Researched:** 2026-02-21
**Confidence:** HIGH (stack and pitfalls verified against official docs; architecture confirmed via direct codebase analysis)

## Executive Summary

OpenFGA Viewer is a developer-focused visualization tool for exploring the structural relationships in OpenFGA authorization models. The existing codebase has strong foundational pieces — a working FGA DSL parser, a Zustand state graph, CodeMirror editor, and React Flow canvas — but the layout pipeline is fundamentally broken. The 3-pass ELK system (hierarchical layout -> grid redistribution -> root repack) invalidates its own edge routes during Pass 2, causing edges to fall back to React Flow's generic `getSmoothStepPath()` which ignores compound boundaries. This produces visual spaghetti that makes the tool unusable for its core purpose. Every other improvement depends on fixing this first.

The recommended architectural change is to replace `INCLUDE_CHILDREN` single-pass layout with a bottom-up 2-phase approach: Phase 1 lays out each compound's children independently (producing accurate compound dimensions and stable internal edge routes), Phase 2 lays out compounds globally using those known dimensions (producing accurate cross-compound edge routes). This eliminates the invalidation chain entirely — each ELK pass owns its coordinate space and its routes are never mutated afterward. Concurrently, switching from POLYLINE to ORTHOGONAL edge routing dramatically improves route readability and makes route preservation after repack trivially achievable via delta translation.

The competitive opportunity is real: no existing OpenFGA tool offers deep model exploration. The Playground is a prototyping scratchpad with a flat graph; OpenFGA Studio is a store management tool that happens to have a graph view. The differentiators — focus mode, directional path tracing, TTU-aware hover expansion — all already have backend graph algorithm implementations in `src/graph/`. The path forward is clear: fix the layout foundation, wire up the existing graph algorithms to polished UI, then add exploration features on top of a stable visual base.

## Key Findings

### Recommended Stack

The current stack (React 19, React Flow v12, elkjs 0.11.0, Zustand 5, CodeMirror 6, Tailwind v4) is correct. No library replacements are needed. The changes are configuration and usage pattern changes, not dependency changes.

The highest-impact single change is switching `elk.edgeRouting` from `POLYLINE` to `ORTHOGONAL`. ORTHOGONAL produces rectilinear (right-angle) segments that are both more readable and translatable by delta after repack — because each segment is axis-aligned, moving a compound by (dx, dy) produces valid translated routes without full recomputation. The second highest-impact change is switching to the bottom-up 2-phase layout (see Architecture section), which eliminates the root cause of route invalidation.

**Core technologies:**
- **elkjs 0.11.0:** Only viable browser library for compound graph layout with cross-hierarchy edge routing. No alternative handles the FGA compound+cross-edge structure.
- **@xyflow/react 12.10.1:** Already in use. v12.5.0+ fixed `fitView` timing — the existing double-`requestAnimationFrame` hack can be removed.
- **ORTHOGONAL edge routing:** Switch from POLYLINE. Rectilinear paths are axis-aligned and survive compound delta translation. Requires port definitions per node (`FIXED_SIDE`) for handle-aware routing.
- **BRANDES_KOEPF node placement:** Switch from NETWORK_SIMPLEX for global layout. Better balance within compounds; NETWORK_SIMPLEX optimizes inter-layer straightness which fights compound compactness.
- **SEPARATE_CHILDREN (per-scope ELK calls):** Switch from `INCLUDE_CHILDREN`. Decouples internal compound layout from global layout, eliminating the chicken-and-egg compound sizing problem.

### Expected Features

The tool has a clear two-tier feature set. The first tier is table stakes — things users expect from any graph visualization tool, many of which are already partially built. The second tier is genuine differentiators that no OpenFGA tool offers.

**Must have (table stakes):**
- **Readable compound layout** — the #1 blocker; every other feature depends on this
- **Node hover highlights** — hover store and TTU BFS already implemented, needs visual wiring
- **Type filtering UI** — `applyFilters` infrastructure exists, toolbar checkboxes need implementing
- **Permissions-only toggle** — filter exists in store, needs a toolbar toggle
- **Minimap + Controls** — React Flow built-ins, one-liner additions
- **Edge visual distinction** — edge types exist, needs refinement for cross-compound edges
- **Layout direction toggle (TB/LR)** — store has it, UI toggle exists, depends on layout fix

**Should have (competitive differentiators):**
- **Focus mode (neighborhood exploration)** — `computeNeighborhood()` exists, needs animated UI
- **Directional path tracing** — `findPaths()` exists, needs directional variants + visual highlighting
- **TTU-aware hover expansion** — `expandViaTtu()` BFS exists, needs tooltip + visual treatment
- **Command palette search (Cmd+K)** — `CommandPalette.tsx` exists, needs node index + fuzzy search
- **Export SVG/PNG** — React Flow `toObject()` + html-to-image pattern; community examples exist

**Defer (v2+):**
- **Compound expand/collapse** — complex; only needed for 10+ type models
- **Semantic zoom (level of detail)** — research-grade; conflicts with expand/collapse
- **URL-shareable state** — depends on all encoded features being stable first

**Anti-features to avoid building:**
- Real-time collaboration, tuple/data management, backend API integration, graph editing (visual model authoring), full a11y — each either conflicts with the core "paste and explore" UX or adds disproportionate complexity.

### Architecture Approach

The core recommendation is to replace the current 3-pass ELK layout with a clean bottom-up 2-phase pipeline. Phase 1 runs independent ELK passes per compound (producing child positions + internal edge routes + compound dimensions). Phase 2 runs one global ELK pass using compound dimensions from Phase 1 (producing compound positions + cross-compound edge routes). Route assembly translates Phase 1 routes to absolute coordinates using Phase 2 compound positions. Every edge has a valid route — no invalidation, no fallback to `getSmoothStepPath`.

**Major components:**
1. **Edge Classifier** — pre-classifies edges as internal (same compound) or cross-compound before any layout runs; drives which phase routes each edge
2. **Internal Layout (Phase 1)** — per-compound ELK passes with band constraints (relations before permissions); produces stable child positions + internal routes + compound dimensions
3. **Global Layout (Phase 2)** — single root ELK pass using Phase 1 compound dimensions; produces compound positions + cross-compound routes
4. **Route Assembly** — translates Phase 1 routes by compound (x,y) from Phase 2; attaches final `elkRoute` to each edge's data
5. **Consolidated Edge Component** — replaces three near-identical edge components (DirectEdge, ComputedEdge, TuplesetDepEdge) with one parameterized component; single place to update routing logic and add cross-compound styling

**Key patterns to follow:**
- Bottom-up compound layout: children sized first, parents positioned second
- Edge classification by scope: internal edges routed in Phase 1, cross-compound in Phase 2
- ORTHOGONAL routing throughout: enables delta translation and route preservation
- `useShallow()` on every Zustand selector returning objects — without it, infinite re-renders

### Critical Pitfalls

1. **ELK edge coordinate space mismatch after compound mutation** — any post-ELK mutation of compound positions invalidates edge routes. Prevention: bottom-up layout ensures no mutations occur after routes are computed. If redistribution is still needed in edge cases, explicitly decide per-edge whether the route survives; never assume survival.

2. **ELK edge relocation to LCA** — with `INCLUDE_CHILDREN`, ELK silently moves edges from root to compound-level `edges[]`. Edges are "lost" if you only collect from `laidOut.edges`. Prevention: if using `INCLUDE_CHILDREN` anywhere, always walk all hierarchy levels to collect edges. In the proposed 2-phase approach (separate ELK calls per scope), this issue disappears because each pass only contains edges for its scope.

3. **React Flow measure-layout-render timing race** — ELK needs `node.measured.width/height` (set by ResizeObserver after paint). Running layout before nodes are measured produces collapsed layouts. Prevention: always gate layout on `useNodesInitialized`, reset `layoutDone.current = false` AND `setLayoutReady(false)` together when adding new layout triggers. The `cancelled` flag pattern must never be removed.

4. **Zustand selector returning new object on every call** — `useStore(s => s.getVisibleGraph())` causes infinite re-renders because Zustand's `Object.is` always sees a new reference. Prevention: wrap with `useShallow()` from `zustand/react/shallow` on every selector returning an object. This is a recurring trap on any new component subscribing to derived data.

5. **`findPaths` combinatorial explosion** — BFS path tracing has no path count limit, causing multi-second UI freezes on dense models (>10 relations per type). Prevention: add `maxPaths` parameter (50 is sufficient) with early exit. Address before shipping focus mode and path tracing features.

## Implications for Roadmap

Based on combined research, the suggested phase structure follows a strict dependency chain: layout foundation enables all visual features; edge polish enables exploration features; exploration features deliver competitive differentiation.

### Phase 1: Layout Foundation

**Rationale:** Every other feature depends on readable compound layout. The current 3-pass ELK pipeline invalidates its own edge routes and produces visual spaghetti. This is not a "nice to have" fix — it is the prerequisite for all other work. No exploration feature, edge styling, or interaction improvement is worth building on a broken layout engine.

**Delivers:** Correctly positioned compound nodes, stable edge routes for both internal and cross-compound edges, no `getSmoothStepPath` fallback in normal operation, clean TB and LR layout directions.

**Addresses (from FEATURES.md):** Readable compound layout (P1), layout direction toggle (P1)

**Implements (from ARCHITECTURE.md):** Edge Classifier, Internal Layout (Phase 1), Global Layout (Phase 2), Route Assembly

**Avoids (from PITFALLS.md):** ELK edge coordinate mismatch, ELK edge relocation to LCA, React Flow timing race, cache mutation corruption

**Key changes:**
- Switch `INCLUDE_CHILDREN` to separate per-scope ELK calls (bottom-up)
- Switch `elk.edgeRouting` from `POLYLINE` to `ORTHOGONAL`
- Switch node placement from `NETWORK_SIMPLEX` to `BRANDES_KOEPF` (global layout)
- Add port definitions (`FIXED_SIDE`) for handle-aware routing
- Remove double-`requestAnimationFrame` hack (React Flow 12.5.0+ fix)

**Research flag:** NEEDS research-phase. The 2-phase layout architecture involves new ELK usage patterns (per-scope calls, route assembly, coordinate translation). The exact band constraint implementation and route assembly edge cases need careful design before coding.

---

### Phase 2: Visual Polish and Edge Quality

**Rationale:** Once layout is correct, edge routing quality and visual distinction become the next bottleneck. Cross-compound edges that route through unrelated compounds create confusion; three near-identical edge components make any visual fix a 3x effort. This phase cleans up the visual layer before adding interactive features that depend on it.

**Delivers:** Unified edge component with cross-compound styling, minimap + controls, complete node hover highlights, consistent routing style (no mixed ELK/smooth-step rendering).

**Addresses (from FEATURES.md):** Minimap + Controls (P1), node hover highlights (P1), edge visual distinction (P1), cross-compound edge distinction (P1)

**Implements (from ARCHITECTURE.md):** Consolidated Edge Component, cross-compound styling

**Avoids (from PITFALLS.md):** Mixed edge routing styles (visual inconsistency), cross-compound edges routing through unrelated compounds

**Key changes:**
- Consolidate DirectEdge/ComputedEdge/TuplesetDepEdge into one `FgaEdge` component
- Add cross-compound edge detection and distinct styling (dashed/different color)
- Wire hover store to node/edge opacity dimming
- Add `<MiniMap>` and `<Controls>` (one-liner additions)
- Verify TTU edges never leak through after edge component refactor

**Research flag:** Standard patterns. Edge component consolidation and hover wiring follow established React Flow patterns. No research-phase needed.

---

### Phase 3: Filtering and Toolbar

**Rationale:** Filtering infrastructure exists in the store but has no working UI. This is a table stakes feature that authorization engineers expect — being able to hide irrelevant types and view only the permission surface. This phase is low-risk, high-visibility, and unblocks the exploration features that follow.

**Delivers:** Working type filter checkboxes, permissions-only toggle, filter state persistence during focus mode.

**Addresses (from FEATURES.md):** Type filtering UI (P1), permissions-only toggle (P1)

**Avoids (from PITFALLS.md):** Filter + focus mode interaction producing orphan nodes (the filter -> focus pipeline order matters — filters must apply before focus mode neighborhood computation)

**Research flag:** No research needed. `applyFilters` is implemented; this is UI wiring only.

---

### Phase 4: Graph Exploration Features

**Rationale:** The competitive differentiators live here. The graph algorithm implementations (`computeNeighborhood`, `findPaths`, `expandViaTtu`) already exist but lack UI and visual treatment. This phase wires them up on the stable layout and visual foundation built in Phases 1-3. The `findPaths` combinatorial explosion pitfall must be addressed before this phase ships.

**Delivers:** Focus mode with animated neighborhood transitions, directional path tracing (upstream/downstream) with visual highlighting, TTU-aware hover expansion with explanation tooltip, command palette with node search and fuzzy matching.

**Addresses (from FEATURES.md):** Focus mode (P2), directional path tracing (P2), TTU-aware hover expansion (P2), command palette search (P2)

**Implements (from ARCHITECTURE.md):** Interaction layer built on stable layout foundation

**Avoids (from PITFALLS.md):** `findPaths` combinatorial explosion (add `maxPaths` limit), `computeNeighborhood` linear scan on large models (build adjacency map once)

**Research flag:** NEEDS research-phase for directional path tracing. The existing `findPaths` is bidirectional; directional variants require understanding the graph traversal semantics (what does "upstream of a permission" mean in FGA's relation-expansion model). TTU expansion semantics also need careful definition before implementation.

---

### Phase 5: Export and Shareability

**Rationale:** Once exploration features are stable, export and URL state make the tool shareable — a significant UX multiplier. Export is needed for documentation workflows; URL state enables sharing specific views. Both are deferred to this phase because they encode the features built in earlier phases and should not be built until those features are stable.

**Delivers:** SVG/PNG export of current graph view, URL hash encoding of filters + focus mode + layout direction.

**Addresses (from FEATURES.md):** Export SVG/PNG (P2), URL-shareable state (P3)

**Avoids (from PITFALLS.md):** No critical pitfalls; URL state encoding is straightforward once the features it encodes are stable.

**Research flag:** Standard patterns. React Flow export via html-to-image is well-documented with community examples. URL hash encoding of flat state is trivial. No research-phase needed.

---

### Phase Ordering Rationale

- **Layout before everything:** The feature dependency graph from FEATURES.md is unambiguous — readable compound layout is the root node. Pan/zoom/interaction work today, but every visual and exploration feature fails without correct layout.
- **Visual cleanup before exploration:** Edge component consolidation (Phase 2) must precede path tracing (Phase 4) because path highlighting needs a single place to apply visual treatment. Building path tracing on three separate edge components would require triple the work.
- **Filtering before focus mode:** Filter state must be stable before focus mode because `computeNeighborhood` runs on the filtered graph. The filter -> focus pipeline order is a documented pitfall.
- **Exploration before shareability:** URL state encodes filters, focus, and direction. Building URL encoding before those features are stable creates churn on the encoding format.

### Research Flags

**Needs `/gsd:research-phase` during planning:**
- **Phase 1 (Layout Foundation):** Bottom-up 2-phase ELK architecture is novel vs. the existing codebase. Specific questions: band constraint implementation for internal layout, route assembly edge cases for self-loop edges, LR direction coordinate translation correctness.
- **Phase 4 (Exploration):** Directional path tracing semantics in FGA. What does "upstream" mean for a permission that is reached via TTU expansion? The graph algorithm changes have real semantic implications.

**Standard patterns (skip research-phase):**
- **Phase 2 (Visual Polish):** Edge component consolidation and hover wiring follow documented React Flow patterns.
- **Phase 3 (Filtering):** Pure UI wiring of existing store infrastructure.
- **Phase 5 (Export):** html-to-image export and URL hash encoding are well-documented patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All recommendations verified against official ELK docs, React Flow changelog, and elkjs release history. No guessing — every option has a documented rationale. |
| Features | MEDIUM | Based on competitor analysis and codebase audit, not direct user feedback. Feature priorities are opinionated but not validated with actual authorization engineers. |
| Architecture | HIGH | Directly derived from codebase analysis (source code read, not inferred) + ELK official hierarchy handling docs. The root cause of layout bugs is verified, not hypothesized. |
| Pitfalls | HIGH | Every critical pitfall is verified against actual bug reports, ELK issue tracker, React Flow issue tracker, and Zustand discussion threads. Not speculative. |

**Overall confidence:** HIGH

### Gaps to Address

- **User validation of feature priorities:** The P1/P2/P3 feature classification is based on competitor analysis and general graph UX research, not user interviews. Directional path tracing and focus mode are prioritized as differentiators — this should be validated with actual OpenFGA users before Phase 4 planning.
- **BRANDES_KOEPF vs. NETWORK_SIMPLEX for internal compound layout:** ARCHITECTURE.md and STACK.md disagree on which node placement strategy to use for internal layout. ARCHITECTURE.md recommends NETWORK_SIMPLEX for Phase 1 internal passes (compact, edge-length minimizing); STACK.md recommends BRANDES_KOEPF for balanced layout. Resolve empirically during Phase 1 implementation by testing both on the sample model.
- **Phase 1 implementation complexity:** The 2-phase layout refactor touches `elk-layout.ts` end-to-end and changes the coordinate model for all edge routing. It is the highest-risk phase. Plan for a 1-2 week implementation window with dedicated testing on TB/LR directions, self-loop edges, and empty compounds.
- **`TYPE_PALETTE` color assignment:** Currently hardcoded to sample model type names. For general use, needs dynamic palette assignment (no two types should share a color in any model). This is a deferred polish item but should not be forgotten.

## Sources

### Primary (HIGH confidence)
- [ELK Layered Algorithm Reference](https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-layered.html) — all layout options, algorithm phases
- [ELK Edge Routing Options](https://eclipse.dev/elk/reference/options/org-eclipse-elk-edgeRouting.html) — ORTHOGONAL vs POLYLINE
- [ELK Hierarchy Handling](https://eclipse.dev/elk/reference/options/org-eclipse-elk-hierarchyHandling.html) — INCLUDE_CHILDREN vs SEPARATE_CHILDREN
- [ELK Node Placement Strategy](https://eclipse.dev/elk/reference/options/org-eclipse-elk-layered-nodePlacement-strategy.html) — BRANDES_KOEPF vs NETWORK_SIMPLEX
- [ELK Port Constraints](https://eclipse.dev/elk/reference/options/org-eclipse-elk-portConstraints.html) — FIXED_SIDE for handle-aware routing
- [ELK JSON Format](https://eclipse.dev/elk/documentation/tooldevelopers/graphdatastructure/jsonformat.html) — edge section coordinates, edge relocation to LCA
- [React Flow 12.5.0 Changelog](https://reactflow.dev/whats-new/2025-03-27) — fitView fix, double-rAF no longer needed
- [React Flow Sub Flows Documentation](https://reactflow.dev/learn/layouting/sub-flows) — parentId, compound node patterns
- [React Flow useNodesInitialized](https://reactflow.dev/api-reference/hooks/use-nodes-initialized) — measure-layout-render timing
- [ELK Issue #700: INCLUDE_CHILDREN broken edge routing](https://github.com/eclipse-elk/elk/issues/700) — verified bug, fixed in current version
- Codebase direct analysis: `src/layout/elk-layout.ts`, `src/canvas/FgaGraph.tsx`, `src/canvas/fgaToFlow.ts`, `src/graph/traversal.ts`, `src/store/viewer-store.ts`, all edge/node components
- Context7: `/kieler/elkjs`, `/xyflow/web` — API usage patterns and integration examples

### Secondary (MEDIUM confidence)
- [ELK hierarchicalSweepiness](https://eclipse.dev/elk/reference/options/org-eclipse-elk-layered-crossingMinimization-hierarchicalSweepiness.html) — tuning recommendation (0.3 vs 0.1 default)
- [React Flow + ELK subflows discussion #3495](https://github.com/xyflow/xyflow/discussions/3495) — hierarchical data conversion patterns
- [Cytoscape.js expand-collapse extension](https://github.com/iVis-at-Bilkent/cytoscape.js-expand-collapse) — compound interaction patterns
- [An Overview+Detail Layout for Compound Graphs (arxiv:2408.04045)](https://arxiv.org/html/2408.04045v1) — semantic zoom research
- [OpenFGA Playground](https://openfga.dev/docs/getting-started/setup-openfga/playground) — competitor feature set
- [Zustand re-render discussion #3228](https://github.com/pmndrs/zustand/discussions/3228) — selector stability patterns
- [@jalez/react-flow-smart-edge](https://github.com/Jalez/react-flow-smart-edge) — maintained A*/JPS edge routing fork (fallback option only)

### Tertiary (LOW confidence)
- OpenFGA Studio competitor analysis — GitHub README only; feature set inferred, not directly tested

---
*Research completed: 2026-02-21*
*Ready for roadmap: yes*
