# Pitfalls Research

**Domain:** Compound graph visualization with ELK layout and React Flow rendering
**Researched:** 2026-02-21
**Confidence:** HIGH (verified against codebase, ELK docs, React Flow docs, and issue trackers)

## Critical Pitfalls

### Pitfall 1: ELK Edge Coordinate Space Mismatch After Compound Mutation

**What goes wrong:**
After any post-ELK mutation of compound nodes (grid redistribution, manual resize, repack), edge route coordinates become invalid because they reference the pre-mutation coordinate space. Edges visually detach from nodes, cross through other nodes, or disappear entirely.

**Why it happens:**
ELK computes edge routes in one coordinate pass. When you mutate compound positions/sizes afterward (as this project's `redistributeCompoundChildren` and `repackRootLevel` do), edge section coordinates are stale. The `json.edgeCoords: 'ROOT'` option forces root-space coordinates, but those root-space values are only valid for the ELK result before mutation. The current codebase already handles this by discarding routes for redistributed compounds and translating surviving routes by repack deltas -- but any change to the mutation logic can silently re-break this.

**How to avoid:**
- Treat edge route validity as a first-class concern: after ANY compound position/size change, explicitly decide per-edge whether the route survives.
- If simplifying the layout pipeline (e.g., removing the 3-pass system), either (a) let ELK compute routes in the final pass, or (b) fall back to React Flow's `getSmoothStepPath` for all affected edges.
- Never assume ELK routes survive post-processing. Write a validation function that checks each route's endpoints against actual node bounds.

**Warning signs:**
- Edges that visually pierce through unrelated nodes.
- Edge endpoints floating in empty space instead of connecting to node handles.
- Edges appearing correct in TB direction but broken in LR (or vice versa), because coordinate translations are direction-dependent.

**Phase to address:**
Layout pipeline rework (Phase 1). This is the most likely regression when changing the layout strategy.

---

### Pitfall 2: ELK Edge Relocation to LCA Breaks Edge Collection

**What goes wrong:**
With `INCLUDE_CHILDREN`, ELK relocates edges to their lowest common ancestor (LCA) in the hierarchy. An edge defined at root level that connects two nodes inside the same compound gets moved into `compound.edges`. If you only collect edges from `laidOut.edges` (root level), you silently lose all intra-compound edge routes.

**Why it happens:**
ELK's `updateContainment()` runs automatically during JSON import. The returned graph structure has edges distributed across hierarchy levels based on endpoint containment. This is documented behavior but violates the intuition that "edges I defined at root stay at root." The current codebase handles this correctly (lines 463-467 of `elk-layout.ts` collect from all levels), but any refactor that rebuilds edge collection will hit this.

**How to avoid:**
- Always walk ALL hierarchy levels to collect edges: `laidOut.edges` + each `child.edges` recursively.
- Add a diagnostic assertion: count edges going in vs. edges coming out. If `output < input`, you dropped edges.
- Use `json.edgeCoords: 'ROOT'` to ensure all edge section coordinates are in root space regardless of relocation. Without this, intra-compound edges use parent-relative coordinates while cross-compound edges use root coordinates, and mixing them produces visual chaos.

**Warning signs:**
- Edges that existed in the input but have no route in the output (they render as straight fallback lines instead of routed paths).
- Edge count mismatch between `toFlowElements` output and post-layout enriched edges.
- Intra-compound edges render correctly but cross-compound edges are mispositioned (or vice versa).

**Phase to address:**
Layout pipeline rework (Phase 1). Must be preserved as an invariant through any refactor.

---

### Pitfall 3: React Flow Layout Timing Race (Measure-Layout-Render Cycle)

**What goes wrong:**
React Flow must measure node DOM elements before layout can run (because ELK needs `node.measured.width/height`). The sequence is: set nodes -> React renders DOM -> ResizeObserver fires -> `node.measured` populated -> `useNodesInitialized` returns true -> run ELK layout -> apply positioned nodes. If any step is skipped or reordered, nodes render at (0,0) with default dimensions, producing a collapsed/overlapping layout.

**Why it happens:**
React's render cycle is asynchronous. `useNodesInitialized` depends on ResizeObserver callbacks that fire after paint. The current codebase uses `layoutDone.current` ref + `cancelled` flag + `prevParseVersion` ref to manage this (FgaGraph.tsx lines 69-124). This interplay of refs, state, and effects is the single most fragile coordination logic in the project.

**How to avoid:**
- Never remove the `cancelled` flag pattern -- it prevents stale layout results from applying after a rapid sequence of changes.
- Use the opacity-0-until-layout-ready pattern (already implemented at line 185-186 of FgaGraph.tsx) to hide the flash of unlayouted nodes.
- When adding new layout triggers (e.g., filter changes, focus mode changes), always reset `layoutDone.current = false` AND `setLayoutReady(false)` together. Missing either causes either no re-layout or a flash of stale positions.
- Never call `setNodes()` with layout results if `nodesInitialized` was false when the layout started -- the measured dimensions were likely wrong.

**Warning signs:**
- Nodes briefly flash at position (0,0) before jumping to correct positions.
- Layout produces a single tight cluster (all nodes overlapping) -- indicates `measured` dimensions were `undefined` and defaulted to 120x40.
- Changing layout direction or filters sometimes produces correct layout, sometimes doesn't -- indicates a race between `layoutDone.current` reset and `nodesInitialized` trigger.

**Phase to address:**
Layout pipeline rework (Phase 1) and exploration features (Phase 3). Any phase that adds new layout triggers must respect the timing protocol.

---

### Pitfall 4: Zustand Selector Returns New Object on Every Call

**What goes wrong:**
`useStore(s => s.getX())` where `getX()` returns `{ nodes, edges }` creates a new object reference every render. Zustand's default `Object.is` comparison sees a different reference, triggers a re-render, which calls the selector again, creating infinite re-render loops.

**Why it happens:**
Zustand selectors must return referentially stable values. The `getVisibleGraph()` method returns `{ nodes, edges }` -- a new object. Without `useShallow` from `zustand/react/shallow`, every call triggers a re-render. The current code (FgaGraph.tsx line 53-55) correctly uses `useShallow`, but any new consumer of `getVisibleGraph()` that forgets `useShallow` will infinite-loop.

**How to avoid:**
- Wrap every call to `getVisibleGraph()` in `useShallow()`.
- For new derived selectors that return objects, either use `useShallow` or destructure into individual primitive selectors: `const nodes = useStore(s => s.getVisibleGraph().nodes)` -- but only if the inner value itself is referentially stable (which it is, due to the module-level cache).
- Add a code comment or lint rule near `getVisibleGraph` warning about this.

**Warning signs:**
- Browser tab freezes immediately after a state change.
- React DevTools shows a component re-rendering thousands of times per second.
- "Maximum update depth exceeded" error in console.

**Phase to address:**
Every phase. This is a recurring trap whenever new components subscribe to derived store data.

---

### Pitfall 5: Mutating ELK Results In-Place Breaks Cache Integrity

**What goes wrong:**
The layout cache stores node/edge references. If `redistributeCompoundChildren` or `repackRootLevel` mutate ELK output objects that are also referenced by cached entries, the cache becomes poisoned -- subsequent cache hits return mutated data with wrong positions.

**Why it happens:**
The current code mutates `laidOut` in-place (the ELK result), then builds NEW positioned node/edge arrays for the cache. This is safe because the cache stores the new arrays, not the ELK result. But if someone refactors to cache the ELK result itself (e.g., to avoid re-running ELK but still re-run redistribution), mutations will corrupt the cache.

**How to avoid:**
- Never cache mutable intermediate results. Cache only final, immutable output.
- If caching ELK results for reuse, deep-clone before mutation.
- The cache key includes node dimensions and edge IDs but NOT layout options like spacing/padding. If those change, the cache serves stale layouts. Add layout-affecting options to the cache key if they become configurable.

**Warning signs:**
- Toggling between two states produces correct layout the first time but wrong layout on return.
- Layout appears stuck on a previous configuration despite input changes.
- Nodes snap to positions from a different filter/direction combination.

**Phase to address:**
Layout pipeline rework (Phase 1). Cache strategy must be revisited if the pipeline changes.

---

### Pitfall 6: Cross-Compound Edges Route Through Compound Boundaries

**What goes wrong:**
Edges connecting nodes in different compounds cut through compound node borders visually. ELK's POLYLINE routing can produce bend points inside a compound that the edge does not actually belong to, making the edge appear to enter and exit a compound container.

**Why it happens:**
ELK's layered algorithm with `INCLUDE_CHILDREN` routes edges globally, but compound borders are purely visual (they are just rectangles drawn by React Flow). ELK has no concept of "this edge must not cross this visual boundary." The POLYLINE routing mode is particularly prone to this because it does not enforce orthogonal segments that would route around compounds.

**How to avoid:**
- Consider ORTHOGONAL routing for cross-compound edges -- it produces cleaner right-angle paths that more naturally route around obstacles.
- Apply post-processing to cross-compound edge routes: detect if intermediate bend points fall inside a compound they do not belong to, and add waypoints that route around the compound perimeter.
- Alternatively, accept the visual artifact and use distinct styling (e.g., dashed lines, different color, higher opacity) for cross-compound edges so users understand they cross boundaries.

**Warning signs:**
- Edge lines appearing to go "through" a compound box instead of around it.
- Users confusing cross-compound edges with intra-compound edges because they visually overlap with compound content.

**Phase to address:**
Edge routing improvements (Phase 2). This is a visual quality issue, not a correctness issue.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Fall back to `getSmoothStepPath` when ELK route unavailable | Edges always render something | Inconsistent visual style (smooth-step vs. polyline) across the same graph | During layout pipeline transition; should converge to one routing style |
| Module-level cache outside Zustand | Avoids Zustand immutability overhead on hot path | Invisible to devtools, breaks time-travel debugging, creates hidden coupling | Acceptable as-is for performance; document prominently |
| Three ELK passes (hierarchical -> grid -> repack) | Handles compound size limits ELK cannot express natively | Double async ELK cost, complex delta tracking, edge route invalidation | Acceptable if unavoidable; simplify to fewer passes if possible |
| `TYPE_PALETTE` hardcoded to sample model types | Pretty colors for the demo | Hash collisions for custom models; no perceptual distinctness guarantee | Never -- should be replaced with dynamic palette assignment |
| Edge component triplication (Direct/Computed/TuplesetDep) | Separate React memo boundaries | Any edge rendering fix must be applied 3 times | Never -- consolidate to a parameterized factory |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| ELK <-> React Flow structure | Passing React Flow's flat node array (with `parentId`) directly to ELK | Convert to ELK's nested `children` structure, then convert positions back. React Flow positions are parent-relative; ELK positions depend on `json.edgeCoords`/`json.shapeCoords` |
| ELK `node.measured` dimensions | Using `node.width`/`node.height` (v11 API) or hardcoded defaults | In React Flow v12, dimensions are at `node.measured?.width` and `node.measured?.height`. Must wait for `useNodesInitialized` before reading. Fallback to 120x40 produces collapsed layouts |
| ELK `elk.bundled.js` with Vite | Wrapping `elk.bundled.js` in a custom Web Worker for "performance" | `elk.bundled.js` creates its own internal Worker (GWT-transpiled). Vite's bundling renames the `Worker` global, causing `_Worker is not a constructor`. Import directly on main thread |
| React Flow `nodeTypes`/`edgeTypes` | Defining the types object inside the component render function | Creates new references every render, causing React Flow to fully re-render the canvas. Define outside the component or memoize |
| React Flow parent-before-child ordering | Adding child nodes before their parent in the nodes array | React Flow v12 requires parents to appear before children. The `toFlowElements` sort (lines 96-100 of fgaToFlow.ts) handles this, but any refactor that changes node ordering must preserve it |
| `@openfga/syntax-transformer` JSON shape | Assuming the output shape is stable across versions | Pre-1.0 package with no formal schema contract. Pin exact version; add runtime shape validation |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| `findPaths` BFS with no path count limit | UI freeze for 5-30 seconds when tracing paths in dense models | Add `maxPaths` parameter (e.g., 50) and break early | Models with >10 relations per type (high fan-out) |
| CSS transitions on node transform for large graphs | Janky animation, dropped frames, sluggish pan/zoom | Disable CSS transitions when node count exceeds threshold (~200); use React Flow's built-in animation | Graphs with >200 visible nodes |
| Re-running ELK layout on every filter toggle | Multi-second delay when toggling filters rapidly; layout cache misses | LRU cache mitigates this, but 5 entries is small. Increase `CACHE_MAX` or debounce filter changes | Switching between >5 filter/direction combinations |
| `computeNeighborhood` scans all edges per hop | Perceptible lag in focus mode for large models | Build adjacency map once (like `findPaths` does) instead of scanning edge array | Models with >500 edges |
| Creating new arrays/objects inside Zustand selectors | Infinite re-renders, tab freeze | Use `useShallow`, select primitives, or ensure referential stability via caching | Any component subscribing to derived data |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Flash of unlayouted nodes at (0,0) before ELK completes | Users see a chaotic jumble that snaps into place; feels broken | Use opacity: 0 until layout ready (already implemented); consider skeleton/spinner for long layouts |
| Edge routing inconsistency (some ELK-routed, some smooth-step fallback) | Some edges follow clean polylines while others use React Flow defaults; looks like a bug | Either route ALL edges via ELK or ALL via fallback. Mixed routing breaks visual consistency |
| Layout direction toggle produces different graph structure | Users expect TB and LR to show the same relationships, just rotated. If grid redistribution changes which compounds are redistributed, the visual graph structure changes between directions | Ensure redistribution threshold is direction-independent, or at least that the same compounds are affected in both directions |
| No visible feedback during ELK layout computation | For large models, the user sees nothing for 1-3 seconds; may think the tool is frozen | Show a loading indicator or skeleton during async layout |
| Compound nodes with 1-2 children look oversized | ELK padding (top=40, left=4, bottom=12, right=4) creates large empty containers for small compounds | Consider minimum compound sizing or adaptive padding based on child count |

## "Looks Done But Isn't" Checklist

- [ ] **Edge routing:** Edges render but some use `getSmoothStepPath` fallback instead of ELK routes -- verify ALL visible edges use consistent routing
- [ ] **LR direction:** Layout looks correct in TB but verify LR produces equivalent quality -- coordinate translations are direction-dependent and bugs often hide in one direction
- [ ] **Self-loop edges:** Nodes with edges to themselves (recursive relations) render correctly -- these get special `sourceNodeWidth` handling and can break if the edge component does not account for it
- [ ] **Empty compounds:** Type nodes with 0 relations/permissions render as leaf nodes, not empty containers -- verify the compound detection logic handles this edge case
- [ ] **Filter + focus mode interaction:** Filtering types while in neighborhood focus mode does not produce orphan nodes or dangling edges -- the filter -> focus pipeline order matters
- [ ] **TTU edges invisible:** TTU edges are filtered at `toFlowElements` and never rendered -- verify they do not leak through after any edge component refactor
- [ ] **Cache invalidation:** Changing layout-affecting parameters (spacing, padding, routing style) busts the layout cache -- verify the cache key includes all parameters that affect output
- [ ] **Parent-before-child ordering:** After any change to `toFlowElements`, parent (type) nodes still appear before children in the array -- React Flow silently fails to create parent-child relationships otherwise

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Edge coordinate mismatch after compound mutation | MEDIUM | Discard all ELK routes, fall back to `getSmoothStepPath` globally. Then fix route translation logic incrementally |
| Infinite re-render from Zustand selector | LOW | Add `useShallow` wrapper. If in production, the page is frozen and requires refresh |
| `findPaths` combinatorial explosion | LOW | Add `maxPaths` limit; BFS queue already bounded by `maxDepth` so the fix is a 2-line early exit |
| Layout timing race (stale layout applied) | MEDIUM | Reset `layoutDone.current` and `setLayoutReady(false)` at the trigger site. Add debug logging to trace the measure-layout-render sequence |
| Cache poisoning from in-place mutation | HIGH | Clear the cache entirely (`layoutCache.length = 0`). Then audit all mutation points to ensure they operate on copies, not cached references |
| ELK edge relocation dropping edges | MEDIUM | Add edge count assertion. Walk all hierarchy levels when collecting edges. Compare input edge count to output route count |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Edge coordinate space mismatch | Phase 1: Layout pipeline | Edge endpoint positions match actual node handle coordinates within 1px tolerance |
| ELK edge relocation to LCA | Phase 1: Layout pipeline | Assert: `routedEdgeCount === inputEdgeCount` after ELK processing |
| React Flow layout timing race | Phase 1: Layout pipeline | No flash of nodes at (0,0); opacity transitions cleanly from 0 to 1 |
| Zustand selector infinite re-render | All phases | No component exceeds 2 re-renders per state change (React DevTools profiler) |
| Cache mutation corruption | Phase 1: Layout pipeline | Toggle between 3+ configurations; all produce correct layout on revisit |
| Cross-compound edge routing | Phase 2: Edge routing | No edge visually passes through a compound it does not belong to |
| `findPaths` combinatorial explosion | Phase 3: Exploration features | Path tracing completes in <500ms for the sample model |
| Edge routing inconsistency (mixed styles) | Phase 2: Edge routing | All visible edges use the same routing algorithm |
| Parent-before-child ordering | Phase 1: Layout pipeline | React Flow parent-child relationships verified by checking `node.parentId` resolution |
| TYPE_PALETTE hash collisions | Phase 4: Polish | No two types share the same color in any loaded model |

## Sources

- [ELK Hierarchy Handling documentation](https://eclipse.dev/elk/reference/options/org-eclipse-elk-hierarchyHandling.html)
- [ELK Issue #700: INCLUDE_CHILDREN broken edge routing](https://github.com/eclipse-elk/elk/issues/700)
- [ELK Issue #776: Edge containment issues for JSON graphs](https://github.com/eclipse-elk/elk/issues/776)
- [elkjs Issue #164: Nested edges unexpected containment](https://github.com/kieler/elkjs/issues/164)
- [React Flow Sub Flows documentation](https://reactflow.dev/learn/layouting/sub-flows)
- [React Flow useNodesInitialized documentation](https://reactflow.dev/api-reference/hooks/use-nodes-initialized)
- [React Flow Migrate to v12](https://reactflow.dev/learn/troubleshooting/migrate-to-v12)
- [React Flow Performance guide](https://reactflow.dev/learn/advanced-use/performance)
- [React Flow + ELK subflows discussion #3495](https://github.com/xyflow/xyflow/discussions/3495)
- [React Flow + ELK subflows discussion #4830](https://github.com/xyflow/xyflow/discussions/4830)
- [React Flow layout timing discussion #2973](https://github.com/xyflow/xyflow/discussions/2973)
- [React Flow useNodesInitialized controlled flow issue #4153](https://github.com/xyflow/xyflow/issues/4153)
- [Zustand re-render discussion #3228](https://github.com/pmndrs/zustand/discussions/3228)
- [Zustand getSnapshot infinite loop discussion #1936](https://github.com/pmndrs/zustand/discussions/1936)
- [ELK Edge Routing options](https://eclipse.dev/elk/reference/options/org-eclipse-elk-edgeRouting.html)
- [ELK Graph Data Structure](https://eclipse.dev/elk/documentation/tooldevelopers/graphdatastructure.html)
- [ELK JSON Format](https://eclipse.dev/elk/documentation/tooldevelopers/graphdatastructure/jsonformat.html)
- Project codebase: `src/layout/elk-layout.ts`, `src/canvas/FgaGraph.tsx`, `src/canvas/fgaToFlow.ts`, `src/store/viewer-store.ts`
- Project `.planning/codebase/CONCERNS.md` (known issues audit)
- Project `CLAUDE.md` memory (architecture facts, ELK gotchas, Zustand pitfalls)

---
*Pitfalls research for: Compound graph visualization with ELK layout and React Flow rendering*
*Researched: 2026-02-21*
