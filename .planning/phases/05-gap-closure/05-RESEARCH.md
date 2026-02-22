# Phase 5: Gap Closure -- Edge Alignment, Breadcrumb Hide, Dead Code Cleanup - Research

**Researched:** 2026-02-22
**Domain:** Codebase cleanup, React Flow edge rendering, Zustand store pruning
**Confidence:** HIGH

## Summary

Phase 5 is a cleanup phase that addresses three categories of gaps identified in the v1.0 audit: a visual edge alignment bug introduced by Phase 3's restyle, hiding the breadcrumb component from the UI, and removing orphaned code that is no longer reachable from any import path or UI surface.

The research examined every file mentioned in the phase description and traced all imports, usages, and dependencies. The dead code inventory is definitive -- every item listed was confirmed through grep analysis of the full `src/` tree. The edge alignment issue requires visual debugging in-browser but the root cause hypothesis is documented with high confidence based on the Handle/port architecture.

**Primary recommendation:** Execute as a single plan with three task groups: (1) edge alignment fix, (2) breadcrumb hide, (3) dead code removal. All items are independent and low-risk.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INT-05 | Esc key or back button exits subgraph and returns to full graph | Already implemented in `App.tsx` lines 34-41 (Esc handler) and lines 72-81 (popstate handler). The breadcrumb provides an additional exit mechanism but the requirement is met via Esc + browser back. Hiding breadcrumbs does not regress INT-05. |
</phase_requirements>

## Standard Stack

No new libraries are needed for this phase. All work uses existing project dependencies.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @xyflow/react | ^12.10.1 | React Flow canvas, Handle component, BaseEdge | Already installed. Edge alignment fix targets Handle positioning within custom nodes |
| zustand | ^5 | Store state pruning | Already installed. Dead code removal targets unused state fields and actions |

### Supporting
No additional libraries needed.

### Alternatives Considered
None -- this is a cleanup phase, not a feature phase.

**Installation:**
```bash
# No installation needed
```

## Architecture Patterns

### Recommended Project Structure
No structural changes. All modifications are deletions or edits to existing files.

### Pattern 1: Dead Code Removal by Dependency Tracing
**What:** Identify orphaned exports by tracing all imports across the `src/` tree, then remove exports with zero consumers.
**When to use:** When removing unused functions, components, or state fields.
**Example:**
```
# Verify zero consumers before deleting
grep -r "expandViaTtu" src/ --include="*.ts" --include="*.tsx"
# If only the definition file shows up → safe to delete
```

### Pattern 2: Hidden Handle Edge Connection
**What:** React Flow determines edge connection points from the Handle component's actual DOM position. The Handle is a styled `div` positioned by React Flow's CSS (`position: absolute` with directional offsets). When the surrounding node's padding, font-size, or layout changes, the Handle's DOM position shifts, causing ELK route endpoints to mismatch.
**When to use:** Understanding the edge alignment bug.

### Anti-Patterns to Avoid
- **Removing store state without removing all reset points:** The path tracing state (`pathStart`, `pathEnd`, `tracedPaths`, etc.) is reset in `parse()`, `setFocusMode()`, and `clearPath()`. All reset locations must be pruned simultaneously.
- **Leaving broken imports:** After deleting `ResizeHandle.tsx`, verify no file imports from it (currently none do -- it is fully orphaned).
- **Breaking the Esc/back navigation by removing breadcrumbs entirely:** The breadcrumb component should be hidden (not rendered) but NOT deleted yet, in case Phase 4 or future work needs it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Edge connection debugging | Manual coordinate math | React Flow DevTools or browser inspector on `.react-flow__handle` elements | Handles are DOM elements with computed positions; inspect them directly |

**Key insight:** This phase is pure cleanup. There is nothing to build, only things to remove or fix.

## Common Pitfalls

### Pitfall 1: Removing State Fields That Are Still Referenced in Reset Blocks
**What goes wrong:** Deleting `pathStart` from the interface but leaving `pathStart: null` in `parse()`'s `set()` call causes a TypeScript error.
**Why it happens:** The path tracing state is reset in 5 different locations within `viewer-store.ts`.
**How to avoid:** Search for EVERY occurrence of each field name before removal. The research found these reset locations:
- `parse()` success path (line ~217)
- `parse()` error path (line ~237)
- `setFocusMode('overview')` (line ~271)
- `setPathStart()` (line ~289)
- `setPathEnd()` (line ~297)
- `clearPath()` (line ~315)
**Warning signs:** TypeScript build errors after editing `viewer-store.ts`.

### Pitfall 2: Edge Alignment Fix Requires Visual Verification
**What goes wrong:** Changing Handle positioning or marker `refX`/`refY` based on theory alone, without seeing the actual rendering.
**Why it happens:** The exact pixel offset depends on card padding, border width, and React Flow's internal handle centering.
**How to avoid:** Start the dev server, open browser DevTools, inspect `.react-flow__handle` elements on a card. Compare their computed positions to where edge paths terminate.
**Warning signs:** Edges look "close but not quite right" after a change.

### Pitfall 3: Deleting breadcrumb vs hiding it
**What goes wrong:** Fully deleting `Breadcrumb.tsx` and its import in `App.tsx`, then later needing it for Phase 4.
**Why it happens:** Phase description says "hide breadcrumbs from UI" not "delete breadcrumbs".
**How to avoid:** Comment out or conditionally hide the `<Breadcrumb />` render in `App.tsx`. Keep the file.
**Warning signs:** None during this phase; risk is future regret.

### Pitfall 4: Console.log Statements Left Behind
**What goes wrong:** Debug logging from development stays in production code.
**Why it happens:** `FgaGraph.tsx` has 10+ `console.log` calls for transition debugging. `viewer-store.ts` has `console.log` calls in `navigateToSubgraph`.
**How to avoid:** Remove ALL `console.log` calls as part of cleanup.
**Warning signs:** Browser console noise in production.

## Code Examples

### Dead Code Inventory (verified via grep)

#### 1. `expandViaTtu()` in `src/graph/traversal.ts` (lines 143-170)
```
grep result: Only appears in its own definition file.
Zero imports. Zero consumers.
Status: SAFE TO DELETE
```

#### 2. `computeDepthLayers()` in `src/graph/traversal.ts` (lines 345-393)
```
grep result: Only appears in its own definition file.
Zero imports. Zero consumers.
Status: SAFE TO DELETE
```

#### 3. `ResizeHandle` component at `src/components/ResizeHandle.tsx`
```
grep result: Zero imports from any .tsx file.
It imports from viewer-store (DEFAULT_EDITOR_WIDTH, setEditorWidth) but nothing imports IT.
Status: SAFE TO DELETE (entire file)
```

#### 4. `editorWidth` state in `src/store/viewer-store.ts`
```
grep result for editorWidth in .tsx files: Only ResizeHandle.tsx (which is itself dead code).
EditorPanel.tsx uses a hardcoded PANEL_WIDTH = 480, does NOT read editorWidth from store.
Associated dead code:
- editorWidth field on ViewerStore interface (line 115)
- setEditorWidth action (line 153)
- editorWidth initial value (line 189)
- setEditorWidth implementation (lines 429-432)
- EDITOR_WIDTH_KEY constant (line 30)
- DEFAULT_EDITOR_WIDTH export (line 32) -- only consumed by ResizeHandle (dead)
- MIN_EDITOR_WIDTH export (line 33) -- only consumed by setEditorWidth (dead)
- MAX_EDITOR_WIDTH_RATIO export (line 34) -- only consumed by setEditorWidth (dead)
- loadPersistedEditorWidth function (lines 39-44) -- only consumed by initial state (dead)
Status: SAFE TO DELETE (all above)
```

#### 5. Path tracing store state
```
Fields (all only referenced within viewer-store.ts itself, zero external consumers):
- pathStart, pathEnd, tracedPaths, tracedNodeIds, tracedEdgeIds (state)
- setPathStart, setPathEnd, tracePath, clearPath (actions)
- findPaths import from traversal.ts
- collectPathElements import from traversal.ts
Associated traversal.ts functions (zero external consumers):
- findPaths() lines 57-99
- collectPathElements() lines 104-134
Status: SAFE TO DELETE (all above)
```

#### 6. Additional dead code discovered during research

**FocusMode and neighborhood state:**
```
FocusMode type has "neighborhood" | "path" modes.
- "neighborhood" mode: Used by selectNode() in viewer-store and onPaneClick in FgaGraph.
selectNode triggers neighborhood mode on node click; onPaneClick resets to overview.
computeNeighborhood() is called in getVisibleGraph() when focusMode === "neighborhood".
Status: STILL ALIVE -- selectNode + onNodeClick triggers it. Keep it.

- "path" mode: Only set by setPathStart() and setPathEnd() which are dead (path tracing).
Status: Can be removed when path tracing is removed, but leaving "path" in FocusMode union type is harmless.
```

**selectedNodeId / selectedEdgeId:**
```
selectNode: Called from FgaGraph.onNodeClick. Triggers neighborhood focus mode.
selectEdge: Called from FgaGraph.onEdgeClick and onPaneClick.
Status: STILL ALIVE. Keep.
```

**getPathMidpoint, getPathMidpointWithOffset, trimPathToHandles in elk-path.ts:**
```
grep result: Only defined in elk-path.ts. Zero imports from any other file.
elkPointsToPath IS imported by DimensionEdge.tsx -- keep it.
Point type IS imported by elk-layout.ts -- keep it.
Status: getPathMidpoint, getPathMidpointWithOffset, trimPathToHandles are SAFE TO DELETE.
NodeBounds interface is only used by trimPathToHandles -- SAFE TO DELETE.
```

**console.log calls:**
```
FgaGraph.tsx: 8 console.log calls (transition/layout debugging)
viewer-store.ts: 4 console.log calls (subgraph navigation debugging)
Status: SAFE TO DELETE (all debug logging)
```

### Edge Alignment Analysis

The edge alignment issue is described as "edge arrow connection points shifted after Phase 3 restyle." Here is the technical analysis:

**Architecture:**
1. ELK computes edge routes based on port positions (FIXED_ORDER ports on WEST/EAST or NORTH/SOUTH sides)
2. React Flow renders edges using Handle DOM positions as connection points
3. DimensionEdge uses ELK route points when available, falling back to `getSmoothStepPath`
4. The arrowhead marker uses `refX={8} refY={4}` with a `viewBox="0 0 8 8"` and `markerWidth={8} markerHeight={8}`

**Root cause hypothesis (HIGH confidence):**
The Handle components inside `TypeCardNode` are positioned inline within flex containers. Phase 3 changed:
- Card padding (now `px-3 py-1.5` for header, `px-3 py-0.5` for rows)
- Font sizes
- Border widths

When React Flow measures Handle positions, it uses their actual DOM coordinates. ELK uses abstract port indices with `FIXED_ORDER` -- it does not know actual pixel positions. The ELK route endpoints may not precisely match the Handle DOM positions.

**Fix approach:**
1. Start dev server and visually inspect the mismatch in browser DevTools
2. The likely fix involves either:
   a. Adjusting the `refX`/`refY` values on the SVG marker to compensate for the offset
   b. Adjusting Handle positioning within the card (e.g., `position: absolute` with explicit offsets)
   c. Verifying that ELK's route start/end points align with React Flow's Handle centers
3. When ELK routes are used (elkRoute points), the path starts and ends at ELK-computed coordinates which may not match Handle centers. The `getSmoothStepPath` fallback uses React Flow's `sourceX/sourceY/targetX/targetY` which ARE derived from Handle positions.

**Key observation:** The ELK route path endpoints and the React Flow Handle positions are computed independently. If they diverge, the arrow appears offset from the Handle.

### Breadcrumb Hide

The Breadcrumb component is rendered in `App.tsx` line 110:
```tsx
<Breadcrumb />
```

To hide it, simply remove or comment out this line. The component file (`src/canvas/Breadcrumb.tsx`) should be kept for potential future use.

INT-05 (Esc/back exits subgraph) is implemented via:
- `App.tsx` line 34-41: Esc key handler calls `popSubgraph()` + `window.history.back()`
- `App.tsx` line 72-81: popstate handler calls `jumpToLevel(targetDepth)`

Hiding breadcrumbs does NOT affect INT-05 compliance.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ResizeHandle with draggable editor width | Fixed 480px panel with translateX slide | Phase 2 (02-01) | ResizeHandle became dead code |
| Path tracing mode (select start/end, trace paths) | Subgraph navigation (click to drill in) | Phase 2 (02-02) | Path tracing store state became dead code |
| expandViaTtu BFS for hover expansion | Row-level traceUpstream/traceDownstream | Phase 1 (01-04) | expandViaTtu became dead code |
| computeDepthLayers for Kahn's algorithm layering | ELK handles layering internally | Phase 1 (01-03) | computeDepthLayers became dead code |
| Breadcrumb trail for navigation | Esc + back button + inspect panel tree | Phase 2 (02-06) | Breadcrumbs became redundant |

**Deprecated/outdated:**
- `expandViaTtu`: Replaced by dimension-aware hover tracing in hover-store
- `computeDepthLayers`: Replaced by ELK's internal layering algorithm
- `findPaths` / `collectPathElements`: Part of dropped PATH-01/PATH-02 features
- `ResizeHandle`: Replaced by fixed-width overlay panel design
- `editorWidth` store state: Panel uses hardcoded `PANEL_WIDTH = 480`

## Open Questions

1. **Edge alignment: exact pixel offset?**
   - What we know: The issue is "edge arrow connection points shifted after Phase 3 restyle." The architecture has two independent coordinate systems (ELK ports vs React Flow Handle DOM positions).
   - What's unclear: The exact pixel offset and whether it affects ELK route paths, fallback paths, or both. Whether the fix is marker adjustment, Handle positioning, or ELK port configuration.
   - Recommendation: Start with visual debugging in browser DevTools. Inspect Handle DOM positions and compare to edge path endpoints. This is a 5-minute investigation that will determine the fix.

2. **Should FocusMode "path" variant be removed?**
   - What we know: The "path" mode is only set by dead code (`setPathStart`, `setPathEnd`). Removing it is technically correct.
   - What's unclear: Whether any future feature might want path tracing.
   - Recommendation: Remove "path" from FocusMode union type. It is dead code. If needed later, it can be re-added.

3. **Should console.log calls be removed or replaced with a debug flag?**
   - What we know: There are 12+ console.log calls in FgaGraph.tsx and viewer-store.ts.
   - What's unclear: Whether the developer wants to preserve debug capability.
   - Recommendation: Remove all console.log calls. They are development artifacts that should not ship. If debug logging is needed later, add a `DEBUG` flag or use a logging utility.

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis via grep/read of all files in `src/`
- `/websites/reactflow_dev` Context7 -- Handle component positioning, BaseEdge markerEnd API, custom edge rendering
- Build verification: `npm run build` passes clean
- Lint verification: `npm run lint` passes clean

### Secondary (MEDIUM confidence)
- Edge alignment root cause is a hypothesis based on architectural analysis. Visual verification in browser is needed to confirm.

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Dead code inventory: HIGH - Every item verified via grep with zero-consumer confirmation
- Breadcrumb hide: HIGH - Trivial change, INT-05 compliance verified via code trace
- Edge alignment: MEDIUM - Root cause hypothesis is sound but requires visual verification
- Architecture: HIGH - No structural changes, pure cleanup

**Research date:** 2026-02-22
**Valid until:** Indefinite (codebase cleanup does not go stale)
