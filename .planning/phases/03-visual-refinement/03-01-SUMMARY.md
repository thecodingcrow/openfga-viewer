# Plan 03-01 Summary: Token Foundation

**Status:** Complete
**Duration:** ~3min
**Date:** 2026-02-22

## What was done

### Task 1: Define warm dark token palette and eliminate blueprint const
- Replaced entire `@theme` block in `src/index.css` with warm neutral palette (17 tokens)
- Removed `blueprint` const, `TYPE_PALETTE`, `EXTRA_COLORS`, `hashString`, `getTypeColor` from `src/theme/colors.ts`
- Removed `accentColor` field from `SchemaCard` interface in `src/types.ts`
- Removed `accentColor` assignment and `getTypeColor` import from `src/canvas/fgaToFlow.ts`
- Updated `.hud-panel` and `.scrollbar-dark` CSS classes to use warm tokens

### Task 2: Migrate all blueprint references to CSS variable references
- Migrated 13+ files from `blueprint.*` to `var(--color-*)`:
  - `Canvas.tsx`, `Breadcrumb.tsx`, `FgaGraph.tsx`, `TypeCardNode.tsx`
  - `DimensionEdge.tsx`, `EditorPanel.tsx`, `fga-theme.ts`
  - `Toolbar.tsx`, `CommandPalette.tsx`, `InspectPanel.tsx`
  - `Tooltip.tsx`, `ResizeHandle.tsx`, `App.tsx`
- Replaced all `rgba(15, 23, 4x, ...)` cold blue patterns with warm equivalents
- Replaced all hardcoded hex values (`#0f1729`, `#2a3a5c`, `#64748b`, etc.)
- Handled hex alpha patterns (`${blueprint.accent}15`) with explicit `rgba()` calls

## Verification

- `npm run build` passes
- `npm run lint` passes
- `grep "blueprint\." src/` returns nothing
- `grep "TYPE_PALETTE" src/` returns nothing
- `grep "getTypeColor" src/` returns nothing
- `grep "accentColor" src/` returns nothing
- `grep "#0f1729|#1a2640|#2a3a5c|#1e3a5c|#162033|#253553" src/` returns nothing

## Decisions

- Token names follow simple flat namespace: `--color-bg`, `--color-surface`, `--color-text-primary`, etc.
- Section dots get dedicated tokens: `--color-dot-binding`, `--color-dot-relation`, `--color-dot-permission`
- `rgba()` with hardcoded accent values (e.g., `rgba(212, 160, 23, 0.08)`) used where alpha is needed since CSS variables don't concatenate with hex alpha
