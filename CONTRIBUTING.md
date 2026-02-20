# Contributing to OpenFGA Viewer

Thanks for your interest in contributing! This guide will help you get started.

## Development Setup

```sh
# Clone the repo
git clone https://github.com/thecodingcrow/openfga-viewer.git
cd openfga-viewer

# Install dependencies
npm install

# Start the dev server
npm run dev
```

## Available Commands

```sh
npm run dev       # Vite dev server
npm run build     # Type-check (tsc -b) + Vite build
npm run lint      # ESLint
npm run preview   # Preview production build
```

## Coding Conventions

- **Strict TypeScript** — `strict: true`, `noUnusedLocals`, `noUnusedParameters`
- **`import type`** — Always use `import type` for type-only imports (`verbatimModuleSyntax` is enabled)
- **React.memo** — All node and edge components are wrapped in `React.memo`
- **Zustand selectors** — Use individual selectors per field to minimize re-renders
- **Tailwind CSS v4** — Uses `@theme` directive in `index.css` for custom design tokens (no `tailwind.config`)

## Pull Request Process

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Ensure `npm run lint` and `npm run build` pass
4. Open a pull request against `main`
5. Fill out the PR template

All PRs are squash-merged to keep a clean linear history.

## Commit Style

Use conventional-style commit messages:

- `feat: add new feature`
- `fix: resolve bug`
- `chore: update dependencies`
- `docs: update README`

## Reporting Bugs

Use the [Bug Report](https://github.com/thecodingcrow/openfga-viewer/issues/new?template=bug_report.yml) issue template.

## Requesting Features

Use the [Feature Request](https://github.com/thecodingcrow/openfga-viewer/issues/new?template=feature_request.yml) issue template.
