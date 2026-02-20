# OpenFGA Viewer

Visual graph explorer for [OpenFGA](https://openfga.dev) authorization models.

[![Deployed on Vercel](https://img.shields.io/badge/deployed%20on-Vercel-black?logo=vercel)](https://openfga-viewer.vercel.app)
[![Version](https://img.shields.io/github/v/tag/thecodingcrow/openfga-viewer?label=version)](https://github.com/thecodingcrow/openfga-viewer/releases)
[![License](https://img.shields.io/github/license/thecodingcrow/openfga-viewer)](./LICENSE)

**Live demo:** [openfga-viewer.vercel.app](https://openfga-viewer.vercel.app)

## Features

- Inline FGA DSL editor with syntax highlighting and autocomplete
- Interactive graph visualization powered by React Flow and ELK layout
- Three focus modes: full graph, type neighborhood, and relation path tracing
- Filter by node type (types, relations, permissions)
- Drag-and-drop `.fga` file import
- Keyboard shortcuts (`Ctrl/Cmd+E` to toggle editor)

## Building from Source

**Prerequisites:** Node.js 18+

```sh
git clone https://github.com/thecodingcrow/openfga-viewer.git
cd openfga-viewer
npm install
```

```sh
npm run dev       # Start dev server
npm run build     # Type-check and build for production
npm run lint      # Run ESLint
npm run preview   # Preview production build
```

## Tech Stack

React 19, TypeScript 5.9, Vite 7, React Flow v12, elkjs, Zustand 5, CodeMirror 6, Tailwind CSS v4

## License

[AGPL-3.0](./LICENSE)
