# External Integrations

**Analysis Date:** 2026-02-21

## APIs & External Services

**None.** This is a fully client-side SPA with no backend API calls. There are no `fetch()`, `axios`, or HTTP client imports anywhere in `src/`. All computation (parsing, graph layout, filtering) happens in the browser.

## Data Storage

**Databases:**
- None. No database of any kind.

**Browser Storage:**
- `localStorage` - Used for two keys in `src/store/viewer-store.ts`:
  - `openfga-viewer-source` - Persists the FGA DSL source text between sessions
  - `openfga-viewer-editor-width` - Persists the editor panel width preference

**File Storage:**
- Local filesystem via browser drag-and-drop only (`src/App.tsx` lines 47-61)
- Users can drop `.fga` files onto the window to load models
- Files are read with `FileReader.readAsText()` — no upload to any server

**Caching:**
- In-memory LRU layout cache (5 entries) in `src/layout/elk-layout.ts`
- In-memory visible graph cache (module-level) in `src/store/viewer-store.ts`
- No external cache service

## Authentication & Identity

**Auth Provider:**
- None. The application has no authentication or user accounts.
- No login, no sessions, no tokens.

## Third-Party Libraries (Integration-Heavy)

**OpenFGA Syntax Transformer:**
- Package: `@openfga/syntax-transformer` ^0.2.1
- Used in: `src/parser/parse-model.ts`
- Purpose: Converts FGA DSL text to OpenFGA JSON AST (`transformer.transformDSLToJSONObject()`)
- Integration type: Pure library call, no network involved
- This is the critical bridge between the editor input and graph construction

**OpenFGA SDK:**
- Package: `@openfga/sdk` ^0.9.2
- Status: **Listed in `package.json` dependencies but not imported anywhere in `src/`**
- Likely reserved for future features (e.g., connecting to a live OpenFGA server) or can be removed as dead dependency

**ELK.js (Graph Layout):**
- Package: `elkjs` ^0.11.0
- Used in: `src/layout/elk-layout.ts`
- Purpose: Computes hierarchical/layered graph layout positions
- Integration type: `elk.bundled.js` runs a GWT-transpiled Java layout engine that spawns its own internal Web Worker
- **WARNING**: Do not wrap in a custom Vite worker — the nested Worker constructor breaks under Vite bundling

**React Flow:**
- Package: `@xyflow/react` ^12.10.1
- Used in: `src/canvas/Canvas.tsx`, `src/canvas/FgaGraph.tsx`, all node/edge components
- Purpose: Canvas rendering, node/edge interaction, pan/zoom, minimap
- Integration type: React component library wrapping a canvas renderer
- Uses `proOptions: { hideAttribution: true }` (requires Pro subscription or open-source license)

**CodeMirror 6:**
- Package: Multiple `@codemirror/*` packages
- Used in: `src/editor/FgaEditor.tsx`, `src/editor/fga-language.ts`, `src/editor/fga-theme.ts`
- Purpose: Code editor with custom FGA DSL syntax highlighting
- Integration type: Self-contained editor component, custom `StreamLanguage` parser for FGA syntax

## Monitoring & Observability

**Error Tracking:**
- None. No Sentry, LogRocket, or similar.

**Logs:**
- No structured logging. Standard `console` only (if any).

**Analytics:**
- None detected. No Google Analytics, Plausible, or similar.

## CI/CD & Deployment

**Hosting:**
- Vercel (inferred from canonical URL `https://openfga-viewer.vercel.app` in `index.html`)
- No `vercel.json` config file — uses Vercel defaults for Vite/React SPA
- No Dockerfile

**CI Pipeline:**
- No GitHub Actions workflows detected (`.github/` contains only issue templates, PR template, and funding config)
- No CI/CD automation files

**GitHub:**
- Repository: `https://github.com/evansims/openfga-viewer` (referenced in `src/toolbar/Toolbar.tsx`)
- Issue templates: `.github/ISSUE_TEMPLATE/bug_report.yml`, `.github/ISSUE_TEMPLATE/feature_request.yml`
- PR template: `.github/PULL_REQUEST_TEMPLATE.md`
- Funding: `.github/FUNDING.yml`

## Environment Configuration

**Required env vars:**
- None required. The app works with zero configuration.

**Optional env vars:**
- `VITE_ALPHA_BANNER` - Set to `"true"` to show alpha warning banner (`src/App.tsx`)

**Secrets:**
- `.env` file exists (contents not read)
- No API keys, tokens, or secrets are needed for any functionality

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## Integration Summary

This is a **zero-integration** client-side application. All data processing happens in the browser:

1. User types FGA DSL in the CodeMirror editor
2. `@openfga/syntax-transformer` parses DSL to JSON AST (no network)
3. Custom parser (`src/parser/parse-model.ts`) builds graph from AST
4. `elkjs` computes layout positions (internal Web Worker)
5. React Flow renders the graph on canvas

No external services, no APIs, no databases, no authentication. The only "integration" is the browser's `localStorage` for persistence and `FileReader` for drag-and-drop file loading.

---

*Integration audit: 2026-02-21*
