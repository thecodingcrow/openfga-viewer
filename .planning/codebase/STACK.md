# Technology Stack

**Analysis Date:** 2026-02-21

## Languages

**Primary:**
- TypeScript ~5.9.3 - All application code (`src/**/*.ts`, `src/**/*.tsx`)
- Target: ES2022 (app), ES2023 (node config)

**Secondary:**
- CSS - Tailwind v4 utility classes + custom properties in `src/index.css`
- HTML - Single SPA entry point `index.html`

## Runtime

**Environment:**
- Node.js v24+ (no `.nvmrc`; local env runs v24.13.0)
- Browser-only runtime — SPA with no server-side code

**Package Manager:**
- pnpm (lockfile: `pnpm-lock.yaml` present)
- No workspace or monorepo setup — single `package.json` at root

## Frameworks

**Core:**
- React 19.2.x - UI framework (`src/main.tsx` entry, `src/App.tsx` root component)
- React Flow v12 (`@xyflow/react` ^12.10.1) - Graph canvas, node/edge rendering, minimap, controls
- Zustand 5.0.x - State management (two stores: `src/store/viewer-store.ts`, `src/store/hover-store.ts`)

**Editor:**
- CodeMirror 6 - FGA DSL editor with syntax highlighting
  - `@codemirror/state`, `@codemirror/view`, `@codemirror/commands`, `@codemirror/language`, `@codemirror/search`, `@codemirror/lint`, `@codemirror/autocomplete`
  - `@lezer/highlight` ^1.2.3, `@lezer/lr` ^1.4.8 - Parser/highlighter infrastructure

**Build/Dev:**
- Vite 7.3.x - Dev server, bundler, HMR (`vite.config.ts`)
- `@vitejs/plugin-react` ^5.1.1 - React Fast Refresh + JSX transform
- `@tailwindcss/vite` ^4.2.0 - Tailwind CSS v4 Vite plugin

**Linting:**
- ESLint 9.39.x with flat config (`eslint.config.js`)
- `typescript-eslint` ^8.48.0 - TS-aware lint rules
- `eslint-plugin-react-hooks` ^7.0.1 - React Hooks lint rules
- `eslint-plugin-react-refresh` ^0.4.24 - Fast Refresh compatibility checks

**Testing:**
- Playwright ^1.58.2 - Listed as devDependency (E2E test runner)
- No unit test framework detected (no Jest, Vitest, or test config files)

## Key Dependencies

**Critical (production):**
- `@xyflow/react` ^12.10.1 - Entire graph visualization canvas; nodes, edges, layout, interaction
- `elkjs` ^0.11.0 - Layered graph layout algorithm (ELK). Uses `elk.bundled.js` (1.6MB GWT-transpiled binary with internal Web Worker). Imported at `src/layout/elk-layout.ts`
- `zustand` ^5.0.11 - Two stores: main viewer store (`src/store/viewer-store.ts`) and hover micro-store (`src/store/hover-store.ts`)
- `@openfga/syntax-transformer` ^0.2.1 - Converts FGA DSL text to JSON AST. Used in `src/parser/parse-model.ts` via `transformer.transformDSLToJSONObject()`
- `react` ^19.2.0 / `react-dom` ^19.2.0 - UI framework

**Infrastructure:**
- `@openfga/sdk` ^0.9.2 - Listed as dependency but **not imported anywhere in `src/`**. Potentially reserved for future server-side integration or unused.
- `tailwindcss` ^4.2.0 - Utility-first CSS framework, configured via Vite plugin (no `tailwind.config.js`)

**Dev-only:**
- `@types/node` ^24.10.1 - Node.js type definitions (Vite config)
- `@types/react` ^19.2.7, `@types/react-dom` ^19.2.3 - React type definitions
- `globals` ^16.5.0 - Browser globals for ESLint config

## TypeScript Configuration

**App config (`tsconfig.app.json`):**
- `strict: true` with `noUnusedLocals`, `noUnusedParameters`
- `verbatimModuleSyntax: true` - **CRITICAL**: Must use `import type` for type-only imports
- `erasableSyntaxOnly: true` - No enums or namespaces allowed
- `moduleResolution: "bundler"` - Vite-native resolution
- `jsx: "react-jsx"` - Automatic JSX transform
- `target: "ES2022"`, `lib: ["ES2022", "DOM", "DOM.Iterable"]`
- `noEmit: true` - TypeScript is type-checker only; Vite handles emit

**Node config (`tsconfig.node.json`):**
- Covers `vite.config.ts` only
- `target: "ES2023"`, `lib: ["ES2023"]`

## Configuration

**Environment:**
- `.env` file present (not read for security)
- Single known env var: `VITE_ALPHA_BANNER` - controls alpha banner visibility (`src/App.tsx`)
- All env vars must be prefixed with `VITE_` for client-side access (Vite convention)

**Build:**
- `vite.config.ts` - Minimal: React plugin + Tailwind CSS plugin
- `tsconfig.json` - Project references to `tsconfig.app.json` and `tsconfig.node.json`
- `eslint.config.js` - Flat ESLint config targeting `**/*.{ts,tsx}`

## Build Scripts

```bash
npm run dev       # vite - Dev server with HMR
npm run build     # tsc -b && vite build - Type-check then bundle
npm run lint      # eslint . - Lint all files
npm run preview   # vite preview - Serve production build locally
```

## Platform Requirements

**Development:**
- Node.js 22+ (ES2022 target, modern pnpm)
- pnpm package manager (lockfile format)

**Production:**
- Static SPA deployment (HTML + JS + CSS)
- Hosted on Vercel (`index.html` canonical URL: `https://openfga-viewer.vercel.app`)
- No server-side runtime required
- No database or backend services

---

*Stack analysis: 2026-02-21*
