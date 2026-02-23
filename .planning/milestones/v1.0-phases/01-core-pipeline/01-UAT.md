---
status: complete
phase: 01-core-pipeline
source: 01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md, 01-04-SUMMARY.md
started: 2026-02-22T02:00:00Z
updated: 2026-02-22T02:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. App Load & Console Errors
expected: App loads at localhost:5173 without console errors or page errors
result: pass

### 2. ERD Schema Cards
expected: FGA types render as dark glass ERD cards with colored accent bar, three sections (bindings/relations/permissions), dimension-colored dots, and expression text on permissions
result: pass

### 3. Dimension-colored Edges
expected: Cross-card edges render with dimension-specific stroke colors (Paul Tol Muted palette) and per-edge arrowhead markers
result: pass

### 4. ELK Layout
expected: Cards positioned by ELK with no overlaps, proper spacing, and orthogonal edge routing
result: pass

### 5. MiniMap and Controls
expected: MiniMap visible with dark glass background, Controls with zoom/fit buttons
result: pass

### 6. Row-level Hover (upstream trace)
expected: Hovering a permission/relation row highlights upstream dependencies, dims non-participating cards to 25% and edges to 8%, tints highlighted rows with cyan
result: pass

### 7. Header Hover (downstream trace)
expected: Hovering card header highlights downstream consumers, dims non-participating cards and edges
result: pass

### 8. Hover Clear
expected: Moving mouse off cards restores all cards and edges to full opacity
result: pass

### 9. Legend Panel
expected: Legend panel displays node type classification (type, relation, binding, permission)
result: pass

## Summary

total: 9
passed: 9
issues: 0
pending: 0
skipped: 0

## Gaps

[none]

## Fixes Applied During UAT

Two bugs discovered and fixed during automated browser testing:

### Fix 1: Handle ID mismatch in fgaToFlow.ts
- **File:** src/canvas/fgaToFlow.ts
- **Issue:** Type-level edge sources/targets (e.g., `user`) generated handle IDs like `user__source` but TypeCardNode renders `user__header_source`. Caused 162 React Flow warnings and an ELK layout error.
- **Fix:** When source/target has no `#` (type-level), use `__header_source`/`__header_target` pattern.
- **Impact:** Edges now connect correctly; warnings eliminated.

### Fix 2: traceDownstream missing type node in seeds
- **File:** src/graph/traversal.ts
- **Issue:** `traceDownstream` seeded BFS with only child rows, missing the type node itself. Type-restriction edges (e.g., `[user]`) originate from the type node, so downstream trace never followed them.
- **Fix:** Added `startTypeId` to the seed set alongside child row IDs.
- **Impact:** Header hover now correctly highlights downstream types connected via type restrictions.
