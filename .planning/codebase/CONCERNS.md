# Codebase Concerns

**Analysis Date:** 2026-02-21

## Tech Debt

**Duplicate color definitions between CSS and JS:**
- Issue: The same color palette is defined twice -- once as CSS custom properties in `src/index.css` (lines 3-15, `@theme` block) and again as a JS object in `src/theme/colors.ts` (the `blueprint` constant). Both must be updated in lockstep; there is no single source of truth.
- Files: `src/index.css`, `src/theme/colors.ts`
- Impact: Adding or changing a theme color requires edits in two places. Drift between them causes visual inconsistencies that are hard to catch since CSS vars are only used for global styles while JS constants drive all component-level styling.
- Fix approach: Either (a) remove the CSS `@theme` block and use the JS `blueprint` object exclusively (most components already use it via inline styles), or (b) generate the JS object from CSS custom properties at build time, or (c) consolidate to CSS vars and read them via `getComputedStyle` at runtime.

**Hardcoded color values scattered in components:**
- Issue: Several components use raw hex/rgba color strings instead of referencing `blueprint` or CSS variables. Examples: `rgba(15, 23, 42, 0.6)` in `TypeNode.tsx`, `#34d399` in `CommandPalette.tsx` (line 209), `#7dd3fc` in `LegendPanel.tsx` (line 70), `rgba(30, 41, 59, 0.9)` across multiple node components, `rgba(15, 23, 41, 0.85)` in `LegendPanel.tsx`.
- Files: `src/canvas/nodes/TypeNode.tsx`, `src/canvas/nodes/RelationNode.tsx`, `src/canvas/nodes/PermissionNode.tsx`, `src/legend/LegendPanel.tsx`, `src/toolbar/CommandPalette.tsx`, `src/components/ResizeHandle.tsx`
- Impact: Theme changes require hunting through every component for magic color values. No quick way to switch to a light theme or alternate palette.
- Fix approach: Add missing tokens to the `blueprint` object in `src/theme/colors.ts` (e.g., `permissionAccent`, `nodeBgTransparent`, `hudBg`) and replace all raw values with references.

**Stale JSDoc comment referencing Dagre:**
- Issue: `src/types.ts` line 80 says `/** Dagre layout direction */` but the project uses ELK, not Dagre.
- Files: `src/types.ts`
- Impact: Misleading for contributors.
- Fix approach: Change comment to `/** ELK layout direction (top-to-bottom or left-to-right) */`.

**Unused dependency `@openfga/sdk`:**
- Issue: `@openfga/sdk` (^0.9.2) is listed in `dependencies` in `package.json` but is never imported anywhere in `src/`. Only `@openfga/syntax-transformer` is used (for DSL-to-JSON parsing).
- Files: `package.json`
- Impact: Increases `node_modules` footprint and install time. Could confuse contributors into thinking there is a live API integration.
- Fix approach: Remove `@openfga/sdk` from `dependencies`.

**Edge component near-duplication:**
- Issue: `DirectEdge.tsx`, `ComputedEdge.tsx`, and `TuplesetDepEdge.tsx` are nearly identical (28 lines each). The only differences are the `edgeType` string passed to `useEdgeInteraction` and optional `strokeDasharray` style.
- Files: `src/canvas/edges/DirectEdge.tsx`, `src/canvas/edges/ComputedEdge.tsx`, `src/canvas/edges/TuplesetDepEdge.tsx`
- Impact: Any edge rendering fix must be applied three times. Easy to miss one.
- Fix approach: Create a single `FgaEdge` component parameterized by edge type and dash pattern, then export three named wrappers (or a factory). The `edgeTypes` map in `FgaGraph.tsx` already differentiates by key.

**Module-level mutable cache in viewer-store:**
- Issue: `getVisibleGraph()` uses module-level variables (`_cacheKey`, `_cachedVisibleNodes`, `_cachedVisibleEdges`, `_cachedFiltersStr`) outside of Zustand to avoid immutability overhead. This is intentional (documented in CLAUDE.md) but creates a hidden coupling -- the cache is invisible to React devtools and Zustand middleware (persist, devtools, immer).
- Files: `src/store/viewer-store.ts` (lines 45-48)
- Impact: If anyone adds Zustand `persist` or `devtools` middleware, this cache will be a blind spot. Time-travel debugging will not reflect filter/focus changes correctly.
- Fix approach: Document the tradeoff more prominently (already in CLAUDE.md). If middleware is ever needed, move to a `useMemo`-based approach inside the consuming component or use a WeakMap keyed on the store snapshot.

**`TYPE_PALETTE` is hardcoded to the sample model's types:**
- Issue: The `TYPE_PALETTE` in `src/theme/colors.ts` has manual entries for `user`, `client`, `category`, etc. -- all matching the sample model. Any other model's types fall through to the `EXTRA_COLORS` hash-based picker. The hash picker can produce collisions (two different type names mapping to the same color).
- Files: `src/theme/colors.ts` (lines 23-34)
- Impact: Users with custom models may see two types with identical colors if the hash collides. The hardcoded palette only benefits the sample model.
- Fix approach: Remove the hardcoded `TYPE_PALETTE` entries and assign colors dynamically by sorting all type names and distributing across a perceptually-distinct palette. Keep `EXTRA_COLORS` as the full palette and assign by index after sorting.

## Known Bugs

No TODO/FIXME/HACK/XXX comments exist in the codebase. No known bugs were identified through static analysis.

## Security Considerations

**`proOptions: { hideAttribution: true }` in React Flow:**
- Risk: This flag hides the React Flow watermark. React Flow's license (MIT) allows this, but the React Flow team gates some features behind a Pro subscription. Using `hideAttribution` without a Pro key may violate their terms if any Pro-only features are used.
- Files: `src/canvas/FgaGraph.tsx` (line 211)
- Current mitigation: Only standard React Flow features are used (no Pro features detected).
- Recommendations: Verify compliance with React Flow's attribution policy. Consider restoring the watermark or purchasing a Pro license.

**localStorage stores raw FGA model text:**
- Risk: `localStorage` is accessible to any JavaScript on the same origin. If the app is hosted on a shared domain, another app could read the stored FGA model. FGA models can reveal internal authorization architecture.
- Files: `src/store/viewer-store.ts` (lines 22-23, 30, 164)
- Current mitigation: The app is a standalone tool, not typically co-hosted. The stored data is the FGA DSL text (authorization model definition), not actual user data or credentials.
- Recommendations: If deploying to a shared hosting environment, consider using `sessionStorage` instead or adding a "clear stored model" action.

**No input sanitization on file import:**
- Risk: The file import (drag-and-drop in `App.tsx` lines 47-61, file input in `Toolbar.tsx` lines 63-77) reads any file as text and passes it directly to `setSource` and `parse`. While the parser (`@openfga/syntax-transformer`) likely handles malformed input gracefully, there is no file size limit or content validation.
- Files: `src/App.tsx` (lines 47-61), `src/toolbar/Toolbar.tsx` (lines 63-77)
- Current mitigation: The `parse` function catches errors and sets `parseError` state.
- Recommendations: Add a file size limit (e.g., 1MB) before reading. Consider validating file extension more strictly.

## Performance Bottlenecks

**`findPaths` BFS can explode combinatorially:**
- Problem: `findPaths()` in `src/graph/traversal.ts` (line 56) uses BFS to find ALL simple paths between two nodes, up to `maxDepth=10`. In a densely connected graph, this is exponential -- the BFS queue stores `{ path: string[], visited: Set<string> }` for every partial path explored.
- Files: `src/graph/traversal.ts` (lines 56-98)
- Cause: The algorithm clones `visited` sets and `path` arrays for every frontier expansion (lines 90-91: `const extended = [...path, neighbor]`, `const nextVisited = new Set(visited)`). With high branching factor, memory and CPU usage grow exponentially.
- Improvement path: Add an early-exit limit on the number of paths found (e.g., `maxPaths=50`). Alternatively, switch to DFS with backtracking to reduce memory allocations.

**`computeNeighborhood` iterates all edges per hop:**
- Problem: For each BFS hop, `computeNeighborhood()` scans the entire edge array (line 24: `for (const edge of edges)`). This is O(hops * edges).
- Files: `src/graph/traversal.ts` (lines 13-47)
- Cause: No precomputed adjacency list. For typical FGA models (< 200 edges) this is fast, but for very large models it could lag.
- Improvement path: Build an adjacency map once, then walk it. Same pattern already used in `findPaths` and `expandViaTtu`.

**ELK layout runs on the main thread:**
- Problem: `elk.bundled.js` is ~1.6MB of GWT-transpiled code. It creates its own internal Web Worker, but the initial instantiation (`new ELK()`) and the `elk.layout()` call still involve main-thread serialization. For very large graphs, this could cause frame drops.
- Files: `src/layout/elk-layout.ts` (line 1, line 391)
- Cause: Documented constraint -- wrapping in a custom Web Worker breaks Vite's bundling of the nested Worker constructor.
- Improvement path: This is a known limitation. The LRU cache (5 entries) mitigates repeated layouts. For truly large models, consider chunking the layout or showing a loading indicator.

**Three ELK passes for redistributed compounds:**
- Problem: When compounds exceed `MAX_COMPOUND_SIZE`, the layout runs three ELK passes: (1) hierarchical layout, (2) grid redistribution (in-memory, fast), (3) root repack (a second ELK call). This doubles the async ELK cost.
- Files: `src/layout/elk-layout.ts` (lines 391, 409: `repackRootLevel`)
- Cause: ELK does not natively support maximum compound dimensions, so the redistribution is a manual post-pass.
- Improvement path: Accept the cost (it is cached). The repack pass operates on a small flat graph (just the compound nodes) so it is fast.

## Fragile Areas

**`FgaGraph.tsx` layout orchestration:**
- Files: `src/canvas/FgaGraph.tsx`
- Why fragile: The layout lifecycle depends on a carefully sequenced chain: `initialNodes` change triggers `setNodes`/`setEdges` + reset of `layoutDone.current` + reset of `layoutReady` state (line 83-89). Then `nodesInitialized` fires (from React Flow measuring DOM), which triggers the ELK layout (line 91-113). The `parseVersion` ref ensures re-layout on new parses (line 115-120). The `layoutDirection` effect also resets `layoutDone` (line 122-124). This interplay of refs, state, and effects is the most complex coordination logic in the codebase.
- Safe modification: Always trace the full lifecycle when changing layout triggers. The `cancelled` flag (line 93) prevents stale layout results from applying. Never remove it.
- Test coverage: No tests exist for this component.

**`elk-layout.ts` redistribution algorithm:**
- Files: `src/layout/elk-layout.ts` (lines 68-213)
- Why fragile: `redistributeCompoundChildren` mutates ELK results in-place. It splits children into relation/permission bands, computes grid positions, and resizes compound nodes. Then `repackRootLevel` runs a second ELK pass and applies position deltas. Edge route preservation logic (lines 510-541) must account for which compounds were redistributed and translate surviving routes by repack deltas.
- Safe modification: Any change to grid layout, padding constants, or band logic requires verifying both TB and LR directions. Test with models of varying sizes (1 relation, 50 relations in one type).
- Test coverage: No tests exist.

**Parser relies on `@openfga/syntax-transformer` internal JSON shape:**
- Files: `src/parser/parse-model.ts` (lines 10-43)
- Why fragile: The parser casts the output of `transformer.transformDSLToJSONObject()` to a custom `ParsedAuthorizationModel` interface. If `@openfga/syntax-transformer` changes its JSON output shape, the parser silently produces wrong results (no runtime validation).
- Safe modification: Pin the `@openfga/syntax-transformer` version carefully. Consider adding a runtime shape check (e.g., Zod validation) for the parsed output.
- Test coverage: No tests exist.

## Scaling Limits

**Graph size limited by React Flow rendering:**
- Current capacity: The sample model has ~40 nodes and ~80 edges. Renders smoothly.
- Limit: React Flow can handle ~500 nodes before performance degrades (each node is a DOM element with CSS transitions). With the transition animations in `src/index.css` (lines 32-36, 42-48), this threshold may be lower.
- Scaling path: For large models, consider disabling CSS transitions beyond a node count threshold, or switch to React Flow's `nodeExtent` virtualization.

**Layout cache limited to 5 entries:**
- Current capacity: 5 layout configurations cached.
- Limit: Switching between more than 5 filter/direction combinations flushes the cache, causing re-layout.
- Scaling path: Increase `CACHE_MAX` in `src/layout/elk-layout.ts` (line 22) or implement a smarter eviction strategy.

**`findPaths` maxDepth=10 with no path count limit:**
- Current capacity: Works for sparse FGA graphs.
- Limit: A model with high fan-out (many relations per type) can produce millions of paths, freezing the UI.
- Scaling path: Add a `maxPaths` parameter to `findPaths()` in `src/graph/traversal.ts` (line 56) and break early once reached.

## Dependencies at Risk

**`elkjs` (^0.11.0):**
- Risk: The bundled `elk.bundled.js` is ~1.6MB of GWT-transpiled Java. ELK is maintained by the Eclipse Foundation but releases are infrequent. The GWT compilation means the JavaScript is not human-readable or debuggable.
- Impact: Any ELK bug in edge routing or hierarchical layout cannot be patched locally.
- Migration plan: No viable alternative for hierarchical compound graph layout in the browser. Accept the dependency.

**`@openfga/syntax-transformer` (^0.2.1):**
- Risk: Pre-1.0 package. The JSON output shape is not formally documented as a stable API. Breaking changes between minor versions are possible.
- Impact: Would break the parser in `src/parser/parse-model.ts` silently (wrong graph, not a crash).
- Migration plan: Pin to exact version. Add integration tests that parse the sample model and assert expected node/edge counts.

## Missing Critical Features

**No error boundary:**
- Problem: There are no React Error Boundaries anywhere in the component tree. An uncaught error in any component (parser crash, React Flow rendering error, layout failure) will unmount the entire app with a blank screen.
- Blocks: Production readiness.
- Files: `src/App.tsx`, `src/canvas/Canvas.tsx`
- Fix: Add an `<ErrorBoundary>` wrapping `<Canvas>` and `<EditorPanel>` separately, with fallback UI showing the error and a "reset" button.

**No accessibility (a11y) support:**
- Problem: Zero `aria-*` attributes, `role` attributes, or `tabIndex` management across the entire codebase. The toolbar buttons have `title` attributes but no `aria-label`. The command palette has no `role="dialog"` or focus trap. The graph canvas is entirely mouse-driven.
- Blocks: WCAG compliance, screen reader support.
- Files: All component files under `src/toolbar/`, `src/canvas/nodes/`, `src/legend/`, `src/components/`
- Fix: Start with the interactive elements (toolbar buttons, command palette, legend panel). Add `role`, `aria-label`, `aria-expanded`, and keyboard navigation support.

**No automated formatter (Prettier):**
- Problem: No `.prettierrc` or equivalent formatting config. ESLint handles linting but not consistent formatting. Code style is maintained by convention only.
- Files: `eslint.config.js`
- Fix: Add Prettier with a config file and integrate into the lint script.

## Test Coverage Gaps

**Zero test files exist:**
- What's not tested: The entire codebase. There are no unit tests, integration tests, or E2E tests. The only test-adjacent file is `scripts/check-graph.js` -- a manual Playwright script that takes a screenshot and counts DOM nodes, but it is not integrated into any test runner or CI pipeline.
- Files: Every file under `src/` is untested.
- Risk: Any refactoring or feature addition can silently break parsing, graph traversal, layout, or rendering. The fragile areas identified above (layout orchestration, ELK redistribution, parser JSON shape) are especially dangerous without tests.
- Priority: **High**
- Recommended test targets (in priority order):
  1. `src/parser/parse-model.ts` -- Unit tests: parse the sample model, assert exact node/edge counts and IDs. Parse edge cases (empty model, single type, cyclical relations).
  2. `src/graph/traversal.ts` -- Unit tests: `computeNeighborhood`, `findPaths`, `applyFilters`, `expandViaTtu` with known graphs.
  3. `src/canvas/fgaToFlow.ts` -- Unit tests: `toFlowElements` produces correct React Flow node/edge shapes, TTU edges filtered, sort order correct.
  4. `src/layout/elk-path.ts` -- Unit tests: `elkPointsToPath`, `trimPathToHandles`, `getPathMidpoint` with known point arrays.
  5. `src/store/viewer-store.ts` -- Integration tests: `parse()` updates state correctly, `getVisibleGraph()` respects filters and focus modes.

**No CI/CD pipeline:**
- What's not tested: No `.github/workflows/` directory exists. No automated linting, type-checking, or test execution on pull requests.
- Files: `.github/` (only issue templates and funding config)
- Risk: Contributors can merge breaking changes without any automated gate.
- Priority: **High**
- Recommended pipeline: GitHub Actions workflow that runs `npm run lint`, `tsc -b` (type check), and (once added) `npm test` on every PR.

---

*Concerns audit: 2026-02-21*
