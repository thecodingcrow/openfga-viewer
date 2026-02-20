# Plan: Clean up mangled top section

## Problem

The toolbar is `absolute top-4` inside the canvas — it floats as a disconnected pill overlapping the graph. Meanwhile the editor has its own "FGA MODEL" header bar. These two elements sit at different visual planes and heights, creating a messy, unintentional top area.

## Design Direction

**Matched header bars** — Convert the floating toolbar into a static top bar inside the canvas wrapper. Give it the same height, padding, and `border-bottom` as the editor header. The two bars sit side-by-side at the same Y position, creating a single continuous horizontal line across the full width.

```
┌──────────┬──┬──────────────────────────────┐
│ FGA MODEL│░░│  🔍  ⊘  ⓘ  ⛶  ⇧  🐙       │  ← visually unified bar
├──────────┤  ├──────────────────────────────┤
│  Editor  │  │         Canvas               │
│  content │  │         (graph area)         │
│          │  │                              │
└──────────┴──┴──────────────────────────────┘
```

## File Changes

### 1. `src/App.tsx` — Canvas wrapper becomes flex-col

The canvas wrapper (right side of the split) changes from a flat relative container to a `flex flex-col`. Toolbar sits on top as a static flow element, canvas fills the rest.

```
Before:  <div className="relative flex-1 min-w-0 overflow-hidden">
           <Canvas />        ← full area
           <Toolbar />       ← absolute overlay, floats on top
           <LegendPanel />   ← absolute overlay
         </div>

After:   <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
           <Toolbar />       ← static bar at top, shrink-0
           <div className="relative flex-1 min-h-0 overflow-hidden">
             <Canvas />
             <LegendPanel />
           </div>
         </div>
```

### 2. `src/toolbar/Toolbar.tsx` — From floating pill to static header bar

**Remove:** `absolute top-4 left-1/2 -translate-x-1/2 z-50`, `hud-panel`, `borderRadius: 8`

**Replace with:** `shrink-0 flex items-center gap-1 px-3 py-2` — same dimensions as the editor header (`px-3 py-2`). Add `border-bottom: 1px solid blueprint.nodeBorder` and matching background (`rgba(15, 23, 41, 0.9)`).

Buttons right-aligned via `ml-auto` or `justify-end` on a wrapper so they sit at the right edge of the canvas header, balancing the "FGA MODEL" label on the left.

CommandPalette stays `fixed` — unaffected.

### 3. `src/editor/EditorPanel.tsx` — No changes

Already has `px-3 py-2` header with `border-bottom: 1px solid blueprint.nodeBorder`. Heights will match.

### 4. `src/components/ResizeHandle.tsx` — No changes

Spans full height of the flex row (header + content) naturally.

## Result

- Both sides share a unified header line at the same pixel height
- Toolbar no longer overlaps graph content
- Canvas gets 100% of its area for the graph (no top overlap)
- `fitView` calculations are accurate since no overlapping toolbar
- Clean, IDE-like aesthetic consistent with VS Code / Figma patterns
