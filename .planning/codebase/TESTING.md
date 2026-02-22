# Testing Patterns

**Analysis Date:** 2026-02-21

## Test Framework

**Runner:**
- No test runner is configured. No `jest.config.*`, `vitest.config.*`, or test scripts exist in `package.json`.
- Playwright is listed as a devDependency (`playwright@^1.58.2`) but has no configuration file, no test files, and no test script.

**Assertion Library:**
- Not configured.

**Run Commands:**
```bash
# No test commands exist in package.json
# Available scripts are: dev, build, lint, preview
npm run lint              # ESLint only — no test execution
```

## Test File Organization

**Location:**
- No test files exist anywhere in `src/`. Zero `.test.ts`, `.test.tsx`, `.spec.ts`, or `.spec.tsx` files.

**Naming:**
- Not established. No conventions to follow yet.

**Structure:**
- Not established.

## Test Structure

**Current State:**
- The project has zero automated tests. All quality assurance relies on:
  1. TypeScript strict mode compilation (`tsc -b` in the build script)
  2. ESLint linting (`npm run lint`)
  3. Manual testing via `npm run dev`

## Mocking

**Framework:** Not applicable (no tests exist).

**What Would Need Mocking:**
- `elkjs/lib/elk.bundled.js` — ELK layout engine (async, spawns internal Web Worker)
- `@openfga/syntax-transformer` — DSL parser (`transformer.transformDSLToJSONObject`)
- `localStorage` — used for persisting editor source and width in `src/store/viewer-store.ts`
- `ReactFlowInstance` — stored in Zustand, used for `fitView()` calls

## Fixtures and Factories

**Test Data:**
- `src/parser/sample-model.ts` exports `SAMPLE_FGA_MODEL` — a comprehensive FGA DSL string (136 lines) covering all authorization patterns (direct, computed, TTU, hierarchical). This serves as a natural test fixture.
- No dedicated test fixtures directory exists.

## Coverage

**Requirements:** None enforced. No coverage tool configured.

**Coverage Gaps (all of them):**
- Parser: `src/parser/parse-model.ts` — `buildAuthorizationGraph()` is pure and highly testable
- Graph algorithms: `src/graph/traversal.ts` — `computeNeighborhood()`, `findPaths()`, `collectPathElements()`, `expandViaTtu()`, `applyFilters()`, `computeDepthLayers()` are all pure functions
- Flow conversion: `src/canvas/fgaToFlow.ts` — `toFlowNode()`, `toFlowEdge()`, `toFlowElements()` are pure functions
- Layout cache: `src/layout/elk-layout.ts` — `buildCacheKey()`, `getCached()`, `putCache()` are testable
- Edge path math: `src/layout/elk-path.ts` — `elkPointsToPath()`, `getPathMidpoint()`, `trimPathToHandles()` are pure geometry functions
- Color utilities: `src/theme/colors.ts` — `getTypeColor()`, `hashString()` are pure
- Store logic: `src/store/viewer-store.ts` — `visibleGraphCacheKey()`, `getVisibleGraph()` derivation logic

## Test Types

**Unit Tests:**
- Not implemented. Strong candidates for unit tests:
  - `src/parser/parse-model.ts` — parse various FGA DSL inputs and assert graph structure
  - `src/graph/traversal.ts` — test neighborhood computation, path finding, TTU expansion, filtering
  - `src/layout/elk-path.ts` — test SVG path generation and point trimming with known coordinates
  - `src/canvas/fgaToFlow.ts` — test node/edge conversion and TTU edge filtering
  - `src/theme/colors.ts` — test color assignment and hash distribution

**Integration Tests:**
- Not implemented. Would cover:
  - Full pipeline: DSL string -> parse -> filter -> toFlowElements -> verify output structure
  - Store actions: test that `parse()`, `selectNode()`, `setFilter()` produce correct derived state

**E2E Tests:**
- Playwright is installed as a devDependency but completely unconfigured. No Playwright config file, no test directory, no test scripts.
- Would be valuable for: editor input -> graph render, node click -> neighborhood focus, file drag-and-drop import

## Recommended Test Setup

Given the codebase structure, a minimal test setup would be:

**Framework Choice:** Vitest (aligns with Vite-based build, zero-config for `.ts` files)

**Configuration needed:**
- Add `vitest` devDependency
- Add `vitest.config.ts` or extend `vite.config.ts`
- Add `"test": "vitest"` script to `package.json`

**Test file placement:** Co-located with source files:
```
src/parser/parse-model.test.ts
src/graph/traversal.test.ts
src/layout/elk-path.test.ts
src/canvas/fgaToFlow.test.ts
src/theme/colors.test.ts
```

**Highest-value first tests:**
1. `src/parser/parse-model.test.ts` — parse `SAMPLE_FGA_MODEL` and assert correct node/edge count, types, and rewrite rules
2. `src/graph/traversal.test.ts` — test `computeNeighborhood()` with known graph topology
3. `src/layout/elk-path.test.ts` — test `elkPointsToPath()` with simple point arrays

## Playwright (E2E) Status

**Installed:** Yes (`playwright@^1.58.2` in devDependencies)
**Configured:** No
**Test files:** None
**Scripts:** None

To activate Playwright:
- Add `playwright.config.ts`
- Add `"test:e2e": "playwright test"` to `package.json`
- Create `e2e/` directory for test files
- Install browser binaries: `npx playwright install`

---

*Testing analysis: 2026-02-21*
