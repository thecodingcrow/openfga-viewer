# OpenFGA Viewer

React-based graph visualization tool for OpenFGA authorization models. Parses FGA DSL into a dependency graph and renders it on a React Flow canvas with ELK layout.

## Tech Stack

- React 19, Vite 7, TypeScript 5.9 (strict + `verbatimModuleSyntax`)
- React Flow v12 — canvas, nodes, edges, minimap, controls
- elkjs — layered graph layout (uses internal Web Worker via elk.bundled.js)
- Zustand 5 — state management
- CodeMirror 6 — FGA DSL editor with syntax highlighting
- Tailwind CSS v4 (via `@tailwindcss/vite` plugin)

## Project Structure

```
src/
├── canvas/           # React Flow canvas, node/edge components, graph-to-flow conversion
│   ├── FgaGraph.tsx  # Main graph component (layout orchestration, event handlers)
│   ├── fgaToFlow.ts  # Converts AuthorizationGraph → React Flow nodes/edges
│   ├── Breadcrumb.tsx
│   ├── nodes/        # TypeNode, RelationNode, PermissionNode (all React.memo)
│   └── edges/        # DirectEdge, ComputedEdge, TtuEdge (all React.memo)
├── editor/           # CodeMirror editor, FGA language support, Lezer grammar
├── graph/            # Graph algorithms — traversal, neighborhood, path tracing, filtering
├── layout/           # ELK layout engine, path trimming
│   └── elk-layout.ts # Layout orchestration + LRU cache (elk.bundled.js uses internal worker)
├── parser/           # FGA DSL → AuthorizationGraph parser
├── store/            # Zustand stores (viewer-store, hover-store)
├── theme/            # Color palette, type-based coloring
├── toolbar/          # Toolbar components (filters, layout direction, path mode)
└── types.ts          # Shared type definitions
```

## Data Flow

```
FGA DSL (editor) → parse (parser/) → AuthorizationGraph (store)
  → applyFilters + focusMode (graph/traversal) → visible graph
  → toFlowElements (canvas/fgaToFlow) → React Flow nodes/edges
  → ELK layout (layout/elk-layout via Web Worker) → positioned nodes/edges
  → React Flow render
```

## Commands

```sh
npm run dev       # Vite dev server
npm run build     # tsc -b && vite build
npm run lint      # eslint
npm run preview   # Preview production build
```

## Conventions

- **Strict TypeScript**: `strict: true`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`
- **`import type`**: Required by `verbatimModuleSyntax` — always use `import type` for type-only imports
- **React.memo**: All node and edge components are wrapped in `React.memo`
- **Tailwind v4**: Uses `@theme` directive in `index.css` for custom design tokens (no `tailwind.config`)
- **Zustand selectors**: Use individual selectors per field to minimize re-renders
- **CSS transitions**: Node movement uses CSS `transform` transitions; edge paths use `opacity` transitions

## Gotchas

- **`verbatimModuleSyntax`**: TS will error if you use `import { Foo }` for a type — must be `import type { Foo }`
- **ELK bundled**: `elk.bundled.js` (1.6MB GWT-transpiled) creates its own internal Web Worker. Don't wrap it in a custom worker (Vite's bundling breaks the nested Worker constructor). Layout results are LRU-cached (5 entries)
- **Module-level cache**: `getVisibleGraph()` uses a module-level cache (`_cacheKey`). It's intentionally outside the store to avoid Zustand immutability overhead
- **Self-loop edges**: Edges where `source === target` get special handling in layout (sourceNodeWidth data) — don't filter them out
- **Editor sync**: Editor uses a 300ms debounce before calling `parse()`. Rapid typing won't trigger re-layout
- **Hover state**: `hoveredNodeId` lives in a separate micro-store (`useHoverStore`) to avoid main store churn on mouse events
