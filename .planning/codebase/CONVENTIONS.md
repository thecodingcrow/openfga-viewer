# Coding Conventions

**Analysis Date:** 2026-02-21

## Naming Conventions

**Files:**
- React components: PascalCase (e.g., `src/canvas/nodes/TypeNode.tsx`, `src/toolbar/CommandPalette.tsx`)
- Non-component modules: kebab-case (e.g., `src/layout/elk-layout.ts`, `src/parser/parse-model.ts`, `src/store/viewer-store.ts`)
- Custom hooks: camelCase with `use` prefix (e.g., `src/canvas/nodes/useNodeInteraction.ts`, `src/canvas/edges/useEdgeInteraction.ts`)
- Theme files: kebab-case (e.g., `src/editor/fga-theme.ts`, `src/editor/fga-language.ts`)

**Functions:**
- Regular functions: camelCase (e.g., `buildAuthorizationGraph`, `toFlowElements`, `computeNeighborhood`)
- React components: PascalCase (e.g., `TypeNodeComponent`, `FgaGraphInner`, `CommandPaletteInner`)
- Pure utility/helper functions: camelCase (e.g., `hashString`, `flattenRewriteRules`, `isPermissionRelation`)
- Boolean predicates: `is` prefix (e.g., `isPermissionRelation`, `isPermBand`)

**Variables:**
- camelCase for all variables (e.g., `edgeSeq`, `layoutDone`, `cachedVisibleNodes`)
- Constants: UPPER_SNAKE_CASE (e.g., `DEBOUNCE_MS`, `MAX_COMPOUND_SIZE`, `CACHE_MAX`, `STORAGE_KEY`)
- Private module-level caches: underscore prefix (e.g., `_cachedVisibleNodes`, `_cacheKey`, `_cachedFiltersStr`)

**Types/Interfaces:**
- PascalCase for all types and interfaces (e.g., `AuthorizationNode`, `FgaNodeData`, `ViewerStore`)
- Type aliases for string unions: PascalCase (e.g., `NodeKind`, `RewriteRule`, `FocusMode`, `LayoutDirection`)
- Interface props: component name + "Props" is NOT used; inline types are preferred for component props

**Zustand Store Naming:**
- Store hooks: `use` + PascalCase + `Store` (e.g., `useViewerStore`, `useHoverStore`)
- Store interface: PascalCase + `Store` (e.g., `ViewerStore`, `HoverStore`)
- Actions: verb-first camelCase (e.g., `setSource`, `selectNode`, `toggleEditor`, `tracePath`)

## Code Style

**Formatting:**
- No Prettier configuration present. No explicit formatter configured.
- Indentation: 2 spaces
- Semicolons: always
- Quotes: double quotes in `.ts` files, single quotes in `.tsx` files (mixed but consistent within each file)
- Trailing commas: used in multi-line arrays, objects, function parameters

**Linting:**
- ESLint 9 with flat config at `eslint.config.js`
- Extends: `@eslint/js` recommended, `typescript-eslint` recommended, `react-hooks` recommended, `react-refresh` vite config
- Run with: `npm run lint`
- ESLint suppress comments are used sparingly with inline justification:
  ```typescript
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: reset layout-ready flag when data changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ```

**Line Length:**
- No enforced max line length. Some lines stretch to ~120+ characters, especially in layout math and style objects.

## Import Organization

**Order (observed pattern):**
1. React imports (`import { useState, useCallback } from 'react'`)
2. Third-party library imports (`import { ReactFlow, ... } from '@xyflow/react'`, `import { create } from 'zustand'`)
3. Internal imports from sibling/parent directories (`import { useViewerStore } from '../store/viewer-store'`)
4. Relative imports within same directory (`import { useNodeInteraction } from './useNodeInteraction'`)

**Critical Rule - `import type`:**
- `verbatimModuleSyntax` is enabled in tsconfig. Use `import type` for all type-only imports.
- Correct: `import type { AuthorizationNode } from '../types'`
- Wrong: `import { AuthorizationNode } from '../types'` (will cause TS error)
- Mixed imports split value and type: `import { MarkerType, type Node, type Edge } from '@xyflow/react'`

**Path Aliases:**
- None configured. All imports use relative paths.

**CSS Imports:**
- Side-effect CSS imports use plain import: `import '@xyflow/react/dist/style.css'` (in `src/canvas/FgaGraph.tsx`)
- Root CSS: `import './index.css'` (in `src/main.tsx`)

## Patterns Used

**React.memo:**
- All custom React Flow node and edge components are wrapped in `React.memo`.
- Pattern: define a named function component, export a `memo()` wrapper:
  ```typescript
  function TypeNodeComponent({ id, data }: NodeProps) {
    // ...
  }
  export const TypeNode = memo(TypeNodeComponent);
  ```
- Applied in: `src/canvas/nodes/TypeNode.tsx`, `src/canvas/nodes/RelationNode.tsx`, `src/canvas/nodes/PermissionNode.tsx`, `src/canvas/edges/DirectEdge.tsx`, `src/canvas/edges/ComputedEdge.tsx`, `src/canvas/edges/TuplesetDepEdge.tsx`

**Zustand Selectors:**
- Always use individual primitive selectors per field to minimize re-renders:
  ```typescript
  const layoutDirection = useViewerStore((s) => s.layoutDirection);
  const parseVersion = useViewerStore((s) => s.parseVersion);
  const selectNode = useViewerStore((s) => s.selectNode);
  ```
- For derived objects that could cause re-renders, use `useShallow` from `zustand/react/shallow`:
  ```typescript
  const { nodes: visibleNodes, edges: visibleEdges } = useViewerStore(
    useShallow((s) => s.getVisibleGraph()),
  );
  ```
- NEVER return new objects from Zustand selectors without `useShallow` -- causes infinite re-renders.

**Arrow Function Components:**
- Page-level and panel components use arrow function syntax with default export:
  ```typescript
  const EditorPanel = () => { ... };
  export default EditorPanel;
  ```
- Sub-components within files also use arrow functions:
  ```typescript
  const ToolbarButton = ({ onClick, title, children, active = false }: { ... }) => ( ... );
  ```

**Custom Hooks:**
- Extracted into separate files with `use` prefix naming.
- Return typed objects: `useNodeInteraction` returns `NodeVisualState`, `useEdgeInteraction` returns `EdgeVisuals`.
- Use `useMemo` to derive visual state from store subscriptions:
  ```typescript
  export function useNodeInteraction(nodeId: string): NodeVisualState {
    const hoveredNodeId = useHoverStore((s) => s.hoveredNodeId);
    return useMemo(() => { ... }, [nodeId, hoveredNodeId, ...]);
  }
  ```

**Module-Level Caching:**
- `src/store/viewer-store.ts`: `getVisibleGraph()` uses module-level variables (`_cachedVisibleNodes`, `_cacheKey`) outside the Zustand store to avoid immutability overhead.
- `src/layout/elk-layout.ts`: LRU cache (5 entries) for layout results, keyed on direction + node dimensions + edge IDs.

**React.startTransition:**
- Used for non-urgent state updates that trigger expensive re-renders:
  ```typescript
  selectNode: (id) => {
    startTransition(() => { set({ ... }); });
  },
  ```
- Applied in: `selectNode`, `setFocusMode`, `setFilter` actions in `src/store/viewer-store.ts`.

**Remount Pattern:**
- Used in `src/toolbar/CommandPalette.tsx`: wrapper renders nothing when closed, mounts inner component fresh on each open to reset state naturally:
  ```typescript
  const CommandPalette = ({ open, onClose }) => {
    if (!open) return null;
    return <CommandPaletteInner onClose={onClose} />;
  };
  ```

**useCallback for Event Handlers:**
- All event handlers in components are wrapped in `useCallback` with explicit dependency arrays.
- Pattern in `src/canvas/FgaGraph.tsx`:
  ```typescript
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => { selectNode(node.id); },
    [selectNode],
  );
  ```

**Effect Cleanup Cancellation:**
- Async effects use a `cancelled` flag pattern:
  ```typescript
  useEffect(() => {
    let cancelled = false;
    someAsyncOp().then((result) => {
      if (cancelled) return;
      // use result
    });
    return () => { cancelled = true; };
  }, [deps]);
  ```
- Used in `src/canvas/FgaGraph.tsx` for layout effect.

**Void Pattern for Unused Variables:**
- Use `void varName` for intentionally unused destructured values (required by ESLint):
  ```typescript
  const { elkRoute: _, ...rest } = e.data;
  void _;
  ```

## Error Handling

**Parser Errors:**
- The `parse` action in `src/store/viewer-store.ts` wraps `buildAuthorizationGraph()` in a try/catch.
- On error: stores `parseError` message (string), clears graph data (`nodes: [], edges: []`), resets all exploration state.
- Error extraction: `e instanceof Error ? e.message : String(e)`
- Parse errors display in `src/editor/EditorPanel.tsx` as a red bar at the bottom of the editor panel.

**No Global Error Boundary:**
- No React error boundary component exists. Application relies on React's default error handling.

**Guard Clauses:**
- Functions use early returns for invalid state: `if (!pathStart || !pathEnd) return;` in `tracePath()`.
- Null checks with optional chaining: `node.relation ?? ''`, `userset.union?.child`, `c.measured?.width ?? 120`.

**File Operations:**
- `FileReader.onload` callback pattern used for file import (no error handler on `onerror`).

## TypeScript Conventions

**Strict Mode:**
- `strict: true` enabled in `tsconfig.app.json`
- Additional strictness flags: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports`
- `erasableSyntaxOnly: true` — prevents `enum` and `namespace` usage (only erasable syntax allowed)

**Target and Module:**
- Target: `ES2022` (app code), `ES2023` (node/config code)
- Module: `ESNext` with `bundler` module resolution
- `moduleDetection: "force"` — all files treated as modules

**Type Annotations:**
- Function parameters always typed. Return types sometimes explicit, sometimes inferred.
- Interface preferred over type alias for object shapes (e.g., `interface AuthorizationNode`, `interface ViewerStore`).
- Type aliases for unions: `type NodeKind = "type" | "relation"`, `type RewriteRule = "direct" | "computed" | "ttu" | "tupleset-dep"`.

**Type Casting:**
- `as` keyword used for safe narrowing: `const d = data as FgaNodeData` in node components.
- Non-null assertion (`!`) used sparingly: `document.getElementById("root")!` in `src/main.tsx`, `queue.shift()!` in graph traversal.
- Type annotations on const objects: `as const` for immutable literals (e.g., `blueprint` object in `src/theme/colors.ts`).

**Generics:**
- Zustand generic: `create<ViewerStore>((set, get) => ({ ... }))`
- React Flow generics: `useNodesState<Node>(initialNodes)`, `useEdgesState<Edge>(initialEdges)`

**Record Types:**
- `Record<string, string>` for dynamic key maps (e.g., `TYPE_PALETTE`)
- `Record<'direct' | 'computed' | 'tupleset-dep', EdgeVisuals>` for exhaustive lookup tables

**JSDoc/TSDoc:**
- Multi-line `/** ... */` comments used for:
  - Module header comments (e.g., top of `src/types.ts`)
  - Function documentation (e.g., `buildAuthorizationGraph`, `computeNeighborhood`)
  - Interface field documentation (e.g., every field in `AuthorizationNode`)
- Single-line `/** ... */` used for brief inline docs (e.g., `/** Derived: filtered + focus-mode-scoped graph for rendering */`)
- Inline `//` comments used for section headers with decorative lines: `// ─── Neighborhood (focus mode) ──────`

## CSS / Styling Conventions

**Tailwind CSS v4:**
- Uses `@tailwindcss/vite` plugin (no `tailwind.config.js`).
- Custom design tokens defined via `@theme` directive in `src/index.css`:
  ```css
  @theme {
    --color-blueprint-bg: #0f1729;
    --color-blueprint-dot: #1e2d4a;
    /* ... */
  }
  ```
- Utility classes used for layout: `flex`, `items-center`, `gap-2`, `px-3`, `py-1.5`, `rounded-lg`, etc.

**Inline Styles:**
- Dynamic styles (colors, opacity, transitions, dimensions) use inline `style` objects, not Tailwind.
- Blueprint theme colors imported from `src/theme/colors.ts` and applied via inline styles:
  ```typescript
  style={{ color: blueprint.muted, background: blueprint.surface }}
  ```
- Hex alpha appended directly to color strings: `${color}40`, `${blueprint.accent}15`

**CSS Transitions:**
- Node movement: CSS `transform` transitions on `.react-flow__node` (300ms cubic-bezier) in `src/index.css`
- Edge paths: `opacity`, `stroke`, `stroke-width`, `filter` transitions (180ms) in `src/index.css`
- UI panels: inline `transition` properties (e.g., `transition: 'width 250ms ease-out'`)

**HUD Panel Pattern:**
- Shared `.hud-panel` CSS class defined in `src/index.css` for floating UI overlays:
  ```css
  .hud-panel {
    background: rgba(15, 23, 41, 0.9);
    backdrop-filter: blur(12px);
    border: 1px solid #2a3a5c;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
  }
  ```
- Used by: Toolbar, LegendPanel, CommandPalette

## Module Design

**Exports:**
- Components: `export default ComponentName` (one per file).
- Stores: named export `export const useViewerStore = create<...>(...)`.
- Utility functions: named exports, multiple per file when related (e.g., `src/graph/traversal.ts` exports 6 functions).
- Constants: named exports (e.g., `export const blueprint = { ... } as const`).

**Barrel Files:**
- Not used. No `index.ts` barrel files exist anywhere in the project.
- All imports reference the specific file directly.

---

*Convention analysis: 2026-02-21*
