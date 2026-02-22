---
phase: quick-4
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/index.css
  - src/inspect/InspectPanel.tsx
  - src/canvas/nodes/TypeCardNode.tsx
autonomous: true
requirements: [QUICK-4]

must_haves:
  truths:
    - "Inspector panel scrollbar matches editor's dark theme scrollbar (thin, #253553 thumb, transparent track)"
    - "Long expression text in the inspector tree truncates with ellipsis instead of overflowing"
    - "Long expression text on type card rows truncates with ellipsis instead of overflowing the card"
  artifacts:
    - path: "src/index.css"
      provides: "Dark scrollbar CSS utility class"
      contains: "scrollbar-dark"
    - path: "src/inspect/InspectPanel.tsx"
      provides: "Inspector tree with dark scrollbar and expression overflow handling"
    - path: "src/canvas/nodes/TypeCardNode.tsx"
      provides: "Type card rows with expression overflow handling"
  key_links:
    - from: "src/index.css"
      to: "src/inspect/InspectPanel.tsx"
      via: "CSS class applied to scrollable container"
      pattern: "scrollbar-dark"
---

<objective>
Fix three visual issues: (1) inspector panel scrollbar uses unstyled browser default instead of the dark theme scrollbar used by the editor, (2) expression text in inspector tree items overflows/clips instead of truncating, (3) expression text on type card node rows overflows the card boundary.

Purpose: Visual consistency -- the inspector panel should match the editor's polished dark theme, and expression text should never overflow its container.
Output: Three files updated with CSS scrollbar styling and proper text overflow handling.
</objective>

<execution_context>
@/Users/thedoc/.claude/get-shit-done/workflows/execute-plan.md
@/Users/thedoc/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/index.css
@src/inspect/InspectPanel.tsx
@src/canvas/nodes/TypeCardNode.tsx
@src/editor/fga-theme.ts (reference for scrollbar style values)
@src/theme/colors.ts (blueprint color tokens)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add dark scrollbar CSS and fix inspector + type card expression overflow</name>
  <files>src/index.css, src/inspect/InspectPanel.tsx, src/canvas/nodes/TypeCardNode.tsx</files>
  <action>
**1. Add dark scrollbar CSS utility to `src/index.css`:**

Add a `.scrollbar-dark` utility class after the existing `.hud-panel` rule block. This replicates the editor's CodeMirror scrollbar styling (from `fga-theme.ts` lines 57-74) as a reusable CSS class:

```css
/* Dark-themed scrollbar matching editor style */
.scrollbar-dark {
  scrollbar-width: thin;
  scrollbar-color: #253553 transparent;
}
.scrollbar-dark::-webkit-scrollbar {
  width: 0.3125rem;
  height: 0.3125rem;
}
.scrollbar-dark::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-dark::-webkit-scrollbar-thumb {
  background: #253553;
  border-radius: 0.1875rem;
}
.scrollbar-dark::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}
```

The color values come from `blueprint.surfaceBorder` (#253553) for thumb and `blueprint.muted` (#64748b) for thumb hover, matching the editor exactly.

**2. Apply scrollbar class to inspector tree container in `src/inspect/InspectPanel.tsx`:**

On line 513, the tree area div currently reads:
```
<div className="flex-1 overflow-y-auto py-1">
```

Change it to:
```
<div className="flex-1 overflow-y-auto py-1 scrollbar-dark">
```

**3. Fix expression text overflow in inspector tree items (`src/inspect/InspectPanel.tsx`):**

The expression span (around line 338-350) currently has `maxWidth: 140` in inline style and `overflow-hidden text-ellipsis` classes. The problem is the parent flex row needs `overflow-hidden` and `min-width: 0` on the expression span's container for text-ellipsis to work in a flex context.

Update the tree item row div (line 272) to add `overflow-hidden`:
```
className="flex items-center gap-1.5 py-0.5 px-2 text-xs cursor-pointer select-none group overflow-hidden"
```

Then update the expression span (around line 338-350) to use `flex: 1` with `min-width: 0` instead of a fixed `maxWidth: 140` so it takes remaining space and truncates properly:
```jsx
<span
  className="ml-1 whitespace-nowrap overflow-hidden text-ellipsis min-w-0 flex-1"
  style={{
    color: blueprint.muted,
    fontSize: "0.65rem",
    fontFamily: "ui-monospace, monospace",
  }}
>
  {node.expression}
</span>
```

Remove the `maxWidth: 140` from the inline style. The `flex-1 min-w-0` combo lets the expression fill remaining row width and truncate with ellipsis when it exceeds the available space.

**4. Fix expression text overflow on type card rows (`src/canvas/nodes/TypeCardNode.tsx`):**

In the `RowItemComponent` (around line 332-335), the expression span currently reads:
```jsx
<span className="text-slate-500 ml-auto whitespace-nowrap">
  {row.expression}
</span>
```

It has no overflow handling. The parent row div (line 278) also needs `overflow-hidden` for truncation to work.

Update the row div (line 278) to add `overflow-hidden min-w-0`:
```
className="px-3 py-0.5 font-mono text-xs flex items-center gap-1.5 text-slate-300 overflow-hidden"
```

Update the expression span to truncate:
```jsx
<span className="text-slate-500 ml-auto whitespace-nowrap overflow-hidden text-ellipsis min-w-0">
  {row.expression}
</span>
```

This ensures long expressions like "client#.can_create_file or client#.can_manage_all_files" truncate with ellipsis instead of overflowing the card boundary.
  </action>
  <verify>
Run `npm run build` to confirm no TypeScript or build errors. Then run `npm run dev` and visually verify:
1. Open inspector panel (Cmd+E, click Inspector tab) -- scrollbar should be thin and dark-themed, matching the editor
2. Load a model with long expressions -- inspector tree should show truncated expressions with ellipsis
3. Check type card nodes on the canvas -- expression text should truncate with ellipsis within card bounds
  </verify>
  <done>
Inspector panel scrollbar matches editor's dark theme. Expression text in both inspector tree items and type card node rows truncates with ellipsis instead of overflowing. Build passes cleanly.
  </done>
</task>

</tasks>

<verification>
- `npm run build` passes with no errors
- Inspector scrollbar uses dark theme (thin, #253553 thumb, transparent track)
- Inspector tree expression text truncates with ellipsis
- Type card node expression text truncates with ellipsis
- No visual regressions in editor scrollbar or other panels
</verification>

<success_criteria>
- All three visual issues resolved in a single task
- Build passes cleanly
- Scrollbar styling reusable via `.scrollbar-dark` CSS class for future panels
</success_criteria>

<output>
After completion, create `.planning/quick/4-fix-inspector-scrollbar-styling-and-expr/4-SUMMARY.md`
</output>
