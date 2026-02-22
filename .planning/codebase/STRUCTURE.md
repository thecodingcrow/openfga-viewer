# Project Structure

**Analysis Date:** 2026-02-21

## Directory Layout

```
openfga-viewer/
├── .claude/                    # Claude Code settings (local, not committed)
├── .github/                    # GitHub templates (issues, PRs, funding)
│   ├── FUNDING.yml
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.yml
│   │   ├── config.yml
│   │   └── feature_request.yml
│   └── PULL_REQUEST_TEMPLATE.md
├── .planning/                  # GSD planning documents
│   └── codebase/               # Architecture & codebase analysis docs
├── .vercel/                    # Vercel deployment config (auto-generated)
├── public/                     # Static assets (empty -- no favicon etc.)
├── scripts/                    # Utility scripts
│   └── check-graph.js          # Graph debugging helper
├── src/                        # Application source code
│   ├── canvas/                 # React Flow canvas, nodes, edges
│   │   ├── edges/              # Custom edge components (3 types)
│   │   └── nodes/              # Custom node components (3 types)
│   ├── components/             # Shared UI components
│   ├── editor/                 # CodeMirror FGA editor
│   ├── graph/                  # Graph algorithms (traversal, filtering)
│   ├── layout/                 # ELK layout engine + path math
│   ├── legend/                 # Legend panel component
│   ├── parser/                 # FGA DSL parser
│   ├── store/                  # Zustand state management
│   ├── theme/                  # Color palette + type coloring
│   ├── toolbar/                # Toolbar + command palette
│   ├── App.tsx                 # Root component
│   ├── index.css               # Global styles + Tailwind + transitions
│   ├── main.tsx                # React entry point
│   └── types.ts                # Shared TypeScript type definitions
├── CLAUDE.md                   # Project-level Claude Code instructions
├── CONTRIBUTING.md             # Contribution guidelines
├── LICENSE                     # License file
├── README.md                   # Project README
├── eslint.config.js            # ESLint flat config
├── index.html                  # HTML entry point (Vite)
├── package.json                # Dependencies and scripts
├── package-lock.json           # npm lockfile
├── pnpm-lock.yaml              # pnpm lockfile (alternate)
├── tsconfig.json               # Root TypeScript config (references)
├── tsconfig.app.json           # App TypeScript config (strict)
├── tsconfig.node.json          # Node TypeScript config (Vite config)
└── vite.config.ts              # Vite configuration
```

## Directory Purposes

**`src/canvas/`:**
- Purpose: Everything related to the React Flow canvas rendering
- Contains: Canvas wrapper, FgaGraph orchestration component, domain-to-flow conversion
- Key files:
  - `Canvas.tsx` -- wraps `<ReactFlowProvider>` and handles empty states
  - `FgaGraph.tsx` -- subscribes to stores, converts to flow elements, triggers layout, wires all event handlers
  - `fgaToFlow.ts` -- `toFlowElements()` and `toFlowNode()`/`toFlowEdge()` conversion functions

**`src/canvas/nodes/`:**
- Purpose: Custom React Flow node components, one per visual node type
- Contains: 3 node components + 1 shared interaction hook
- Key files:
  - `TypeNode.tsx` -- compound (container with children) and leaf (standalone) variants
  - `RelationNode.tsx` -- relation nodes with tupleset binding variant (dashed border)
  - `PermissionNode.tsx` -- permission nodes (pill/rounded-full shape, emerald accent)
  - `useNodeInteraction.ts` -- shared hook returning `{ dimmed }` from hover/trace state

**`src/canvas/edges/`:**
- Purpose: Custom React Flow edge components, one per visual edge type
- Contains: 3 edge components + 1 shared interaction hook
- Key files:
  - `DirectEdge.tsx` -- solid line, represents direct type restrictions
  - `ComputedEdge.tsx` -- dashed line (`4 3`), represents computed userset references
  - `TuplesetDepEdge.tsx` -- dotted line (`2 4`), represents tupleset dependency bindings
  - `useEdgeInteraction.ts` -- shared hook returning visual state (stroke, width, opacity, glow, zIndex)

**`src/editor/`:**
- Purpose: CodeMirror 6 FGA DSL editor with syntax highlighting
- Contains: Panel wrapper, editor component, language definition, theme
- Key files:
  - `EditorPanel.tsx` -- collapsible panel with header, error bar
  - `FgaEditor.tsx` -- CodeMirror EditorView creation, 300ms debounced `parse()` callback
  - `fga-language.ts` -- FGA StreamLanguage parser (tokens: keyword, typeName, variableName, operator, bracket, comment)
  - `fga-theme.ts` -- dark blueprint CodeMirror theme + syntax highlighting colors

**`src/graph/`:**
- Purpose: Pure graph algorithms operating on `AuthorizationNode[]`/`AuthorizationEdge[]`
- Contains: Single traversal module with all algorithms
- Key file: `traversal.ts` exports:
  - `computeNeighborhood()` -- k-hop BFS neighborhood extraction
  - `findPaths()` -- BFS all simple paths between two nodes
  - `collectPathElements()` -- collect node/edge IDs on paths
  - `expandViaTtu()` -- BFS expansion via TTU edges only
  - `applyFilters()` -- type and permission-only filtering
  - `computeDepthLayers()` -- topological depth via Kahn's algorithm
  - `extractTypeNames()` -- sorted unique type names

**`src/layout/`:**
- Purpose: ELK-based graph layout computation and edge path geometry
- Contains: Layout engine with 3-pass pipeline, LRU cache, SVG path utilities
- Key files:
  - `elk-layout.ts` -- `getLayoutedElements()`: builds hierarchical ELK graph, runs layout passes, returns positioned nodes/edges
  - `elk-path.ts` -- `elkPointsToPath()` (SVG path with quadratic Bezier corners), `trimPathToHandles()`, `getPathMidpoint()`, `getPathMidpointWithOffset()`

**`src/parser/`:**
- Purpose: FGA DSL string to `AuthorizationGraph` conversion
- Contains: Parser/graph builder, sample model
- Key files:
  - `parse-model.ts` -- `buildAuthorizationGraph(dsl)`: transforms DSL to JSON via `@openfga/syntax-transformer`, walks type definitions to create nodes (type + relation) and edges (direct, computed, TTU, tupleset-dep)
  - `sample-model.ts` -- `SAMPLE_FGA_MODEL`: default FGA model loaded on first visit (tenant-scoped RBAC example)

**`src/store/`:**
- Purpose: Zustand state management
- Contains: Main store + hover micro-store
- Key files:
  - `viewer-store.ts` -- `useViewerStore`: source text, parsed graph, filters, focus mode, path tracing, UI state, all actions, `getVisibleGraph()` derived computation
  - `hover-store.ts` -- `useHoverStore`: `hoveredNodeId`, `expandedNodeIds`, `focalNodeIds` -- isolated to prevent main store churn on mouse events

**`src/theme/`:**
- Purpose: Centralized color definitions
- Key file: `colors.ts` exports:
  - `blueprint` -- object with named colors for bg, surface, nodes, edges, UI elements
  - `TYPE_PALETTE` -- named type-to-color mapping (e.g., `user: '#f59e0b'`, `client: '#3b82f6'`)
  - `getTypeColor(typeName)` -- returns palette color or hash-based fallback from `EXTRA_COLORS`

**`src/toolbar/`:**
- Purpose: Bottom toolbar and command palette (search)
- Key files:
  - `Toolbar.tsx` -- floating bottom-center toolbar with icon buttons: search, permissions-only toggle, legend toggle, fit view, import file, GitHub link
  - `CommandPalette.tsx` -- cmd+K modal: text search over all nodes, keyboard navigation, navigates + focuses on selection

**`src/legend/`:**
- Purpose: Legend panel explaining visual encoding
- Key file: `LegendPanel.tsx` -- animated slide-up panel showing node types (type, relation, binding, permission) and edge types (direct, computed, tupleset-dep) with visual swatches

**`src/components/`:**
- Purpose: Shared UI components not specific to one feature
- Key file: `ResizeHandle.tsx` -- draggable resize handle between editor and canvas panels, collapse/expand affordance

## Key File Locations

**Entry Points:**
- `index.html`: Vite HTML entry, loads `src/main.tsx`
- `src/main.tsx`: React root creation, renders `<App />` in StrictMode
- `src/App.tsx`: Root component -- layout composition, keyboard shortcuts, file drag-and-drop

**Configuration:**
- `vite.config.ts`: Vite config (React plugin + Tailwind CSS v4 plugin)
- `tsconfig.json`: Root config with project references to `tsconfig.app.json` and `tsconfig.node.json`
- `tsconfig.app.json`: App config -- `strict: true`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`
- `eslint.config.js`: ESLint flat config
- `src/index.css`: Global styles, Tailwind import, CSS custom properties via `@theme`, React Flow transition overrides

**Core Logic:**
- `src/parser/parse-model.ts`: FGA DSL to AuthorizationGraph
- `src/graph/traversal.ts`: All graph algorithms
- `src/layout/elk-layout.ts`: 3-pass ELK layout pipeline
- `src/store/viewer-store.ts`: Central state management
- `src/canvas/fgaToFlow.ts`: Domain to React Flow conversion

**Type Definitions:**
- `src/types.ts`: All shared domain types (`AuthorizationNode`, `AuthorizationEdge`, `AuthorizationGraph`, `NodeKind`, `RewriteRule`, `FocusMode`, `GraphFilters`, `LayoutDirection`)
- `src/canvas/fgaToFlow.ts`: `FgaNodeData` interface (React Flow node data shape)
- `src/layout/elk-layout.ts`: `ElkRoute` interface
- `src/layout/elk-path.ts`: `Point`, `NodeBounds` interfaces

**Rendering:**
- `src/canvas/FgaGraph.tsx`: Layout orchestration + React Flow render
- `src/canvas/nodes/*.tsx`: Node visual components (3)
- `src/canvas/edges/*.tsx`: Edge visual components (3)

## Naming Conventions

**Files:**
- **Components**: PascalCase (e.g., `FgaGraph.tsx`, `TypeNode.tsx`, `CommandPalette.tsx`)
- **Modules/utilities**: kebab-case (e.g., `parse-model.ts`, `elk-layout.ts`, `elk-path.ts`, `fga-language.ts`)
- **Stores**: kebab-case with `-store` suffix (e.g., `viewer-store.ts`, `hover-store.ts`)
- **Conversion modules**: camelCase (e.g., `fgaToFlow.ts`)
- **Hooks**: camelCase with `use` prefix (e.g., `useNodeInteraction.ts`, `useEdgeInteraction.ts`)
- **Type definition files**: kebab-case (e.g., `types.ts`)

**Directories:**
- Lowercase, hyphenated when multi-word (e.g., `canvas`, `nodes`, `edges`)
- Feature-based grouping (editor, canvas, toolbar, legend, parser, graph, layout, store, theme)

**Exports:**
- Components: Named export (`export const TypeNode = memo(...)`) or default export (`export default Canvas`)
- Stores: Named export (`export const useViewerStore = create<...>(...)`)
- Utility functions: Named exports (`export function buildAuthorizationGraph(...)`)
- Types: Named exports (`export type NodeKind = ...`, `export interface AuthorizationNode {...}`)

## Where to Add New Code

**New Graph Algorithm:**
- Add to `src/graph/traversal.ts` as a named export function
- Import in store or canvas layer as needed
- Follow existing pattern: pure function taking `AuthorizationNode[]`/`AuthorizationEdge[]`, returning derived data

**New Node Type:**
- Create `src/canvas/nodes/NewNodeType.tsx` following `RelationNode.tsx` pattern
- Wrap in `React.memo`
- Use `useNodeInteraction(id)` for dimming
- Register in `nodeTypes` map in `src/canvas/FgaGraph.tsx`
- Add conversion logic in `src/canvas/fgaToFlow.ts`

**New Edge Type:**
- Create `src/canvas/edges/NewEdge.tsx` following `DirectEdge.tsx` pattern
- Wrap in `React.memo`
- Use `useEdgeInteraction(id, source, target, type)` for visual state
- Register in `edgeTypes` map in `src/canvas/FgaGraph.tsx`
- Add conversion logic and marker in `src/canvas/fgaToFlow.ts`
- Add REST/ACTIVE visual configs in `src/canvas/edges/useEdgeInteraction.ts`

**New Store State:**
- Add to `ViewerStore` interface in `src/store/viewer-store.ts`
- Add initial value in the `create()` call
- Add action(s) as needed
- If high-frequency (e.g., mouse-driven), consider a separate micro-store like `src/store/hover-store.ts`

**New UI Panel:**
- Create `src/{feature}/PanelName.tsx`
- Import and compose in `src/App.tsx`
- Use `useViewerStore` for state, `blueprint` from `src/theme/colors.ts` for styling
- Follow the HUD panel pattern: `className="hud-panel"` for consistent floating panel styling

**New Theme Colors:**
- Add to `blueprint` object in `src/theme/colors.ts`
- Optionally mirror in `src/index.css` `@theme` block if needed in Tailwind utilities

**New Toolbar Button:**
- Add a `<ToolbarButton>` in `src/toolbar/Toolbar.tsx` following existing pattern
- Add separator `<Separator />` between button groups

**New Filter:**
- Add field to `GraphFilters` interface in `src/types.ts`
- Update `DEFAULT_FILTERS` in `src/store/viewer-store.ts`
- Update `applyFilters()` in `src/graph/traversal.ts`
- Add UI toggle in `src/toolbar/Toolbar.tsx`

## Special Directories

**`.planning/`:**
- Purpose: GSD planning and codebase analysis documents
- Generated: By Claude Code mapping commands
- Committed: Yes

**`.vercel/`:**
- Purpose: Vercel deployment configuration
- Generated: Yes, by Vercel CLI
- Committed: Partially (project.json)

**`public/`:**
- Purpose: Static assets served at root
- Generated: No
- Committed: Yes (currently empty)

**`dist/`:**
- Purpose: Vite production build output
- Generated: Yes, by `npm run build`
- Committed: No (in `.gitignore`)

**`node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes, by `npm install`
- Committed: No (in `.gitignore`)

---

*Structure analysis: 2026-02-21*
