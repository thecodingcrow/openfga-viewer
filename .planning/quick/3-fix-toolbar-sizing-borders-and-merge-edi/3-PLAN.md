---
phase: quick-3
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/toolbar/Toolbar.tsx
  - src/editor/EditorPanel.tsx
autonomous: true
requirements: [quick-3]

must_haves:
  truths:
    - "Toolbar buttons are compact (32-36px) with proportional icons"
    - "Toolbar has unified pill border radius throughout (no mixed round/square)"
    - "Shortcut badges are removed from toolbar inline, shortcuts shown in title/tooltip only"
    - "EditorPanel tab header is clearly visible with legible text and distinct active/inactive states"
  artifacts:
    - path: "src/toolbar/Toolbar.tsx"
      provides: "Compact toolbar with consistent borders"
      contains: "w-8 h-8"
    - path: "src/editor/EditorPanel.tsx"
      provides: "Visible tab header with larger text"
      contains: "text-xs"
  key_links:
    - from: "src/toolbar/Toolbar.tsx"
      to: "src/theme/colors.ts"
      via: "blueprint color imports"
      pattern: "blueprint\\."
    - from: "src/editor/EditorPanel.tsx"
      to: "src/store/viewer-store.ts"
      via: "panelTab state"
      pattern: "panelTab"
---

<objective>
Fix toolbar button sizing/border inconsistencies and make EditorPanel tab header visible.

Purpose: The toolbar buttons are oversized (48px) with tiny icons and mixed border radii (pill container vs rounded-xl buttons). The panel tab header is nearly invisible (10px text, muted colors, 36px height). Both need visual fixes.
Output: Compact, consistent toolbar; clearly visible tab bar in EditorPanel.
</objective>

<execution_context>
@/Users/thedoc/.claude/get-shit-done/workflows/execute-plan.md
@/Users/thedoc/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/toolbar/Toolbar.tsx
@src/editor/EditorPanel.tsx
@src/theme/colors.ts
@src/index.css
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix toolbar button sizing, icon proportions, and border consistency</name>
  <files>src/toolbar/Toolbar.tsx</files>
  <action>
In `ToolbarButton`:
- Change button size from `w-12 h-12` (48px) to `w-8 h-8` (32px) for compact look
- Change `rounded-xl` (12px border-radius) to `rounded-full` so buttons match the pill-shaped container
- Keep hover/active styles as-is (they work with any size)

For all SVG icons in the toolbar:
- Change icon dimensions from `width="20" height="20"` to `width="16" height="16"` — proportional to 32px buttons (50% fill ratio)
- Keep all viewBox values as-is (they define the coordinate system, not size)

Remove inline shortcut badges entirely:
- Delete the two `<span>` elements showing "Cmd+E" and "Cmd+K"
- The shortcuts are already in the `title` attribute on each ToolbarButton (shown as native tooltip on hover), so discoverability is preserved

For the `Separator`:
- Reduce height from `h-7` to `h-5` to match smaller buttons
- Keep `mx-0.5` spacing

For the container div:
- Reduce gap from `gap-1.5` to `gap-1` and padding from `px-3 py-2` to `px-2 py-1.5` for tighter grouping
  </action>
  <verify>Run `npm run build` — no type or compilation errors. Visually: toolbar should be a compact pill with evenly-sized round buttons, no shortcut badges.</verify>
  <done>Toolbar buttons are 32px with rounded-full borders matching the pill container. Icons are 16px. No inline shortcut badges. Separator is proportional.</done>
</task>

<task type="auto">
  <name>Task 2: Make EditorPanel tab header visible with larger text and stronger contrast</name>
  <files>src/editor/EditorPanel.tsx</files>
  <action>
In the header container div (the flex row with tabs):
- Change height from `2.25rem` (36px) to `2.75rem` (44px) for more visual presence
- Change `px-3` to `px-4` for slightly more breathing room
- Change the borderBottom from `0.0625rem solid` (1px, nearly invisible) to `1px solid` with the same `blueprint.surfaceBorder` color — just use a normal "1px" string instead of the fractional rem

For each tab button:
- Change `text-[10px]` to `text-xs` (12px) — 20% larger, clearly legible
- Change `tracking-[0.12em]` to `tracking-wider` (0.05em) — less aggressively spaced
- Keep `font-semibold` and `uppercase`
- For the active tab color: keep `blueprint.accent` (gold) — it works well
- For the inactive tab color: change from `blueprint.muted` (#64748b) to `blueprint.nodeBody` (#94a3b8) — significantly brighter, better contrast against dark background
- Change borderBottom width from `2px solid` to `2px solid` (keep same) but ensure the inactive state uses "none" instead of "2px solid transparent" to avoid layout shift — actually keep the transparent approach for stable layout, it works fine
- Add a subtle hover effect for inactive tabs: add onMouseEnter/onMouseLeave that sets color to `blueprint.accent` on hover, returns to `blueprint.nodeBody` on leave (only if not active)

For the close button and Cmd+E badge on the right side:
- Keep as-is — they are appropriately sized for the header

These changes make the tab header clearly visible: taller row, larger text, brighter inactive color, gold active indicator.
  </action>
  <verify>Run `npm run build` — no type or compilation errors. Visually: tab header should be clearly visible at top of panel with "Editor" and "Inspector" tabs in readable text, gold underline on active tab.</verify>
  <done>Tab header is 44px tall with 12px text. Inactive tabs use nodeBody color (#94a3b8) for clear visibility. Active tab has gold accent underline. Header border is visible 1px solid line.</done>
</task>

</tasks>

<verification>
Run `npm run build` to confirm no TypeScript or build errors across both files.
Run `npm run lint` to confirm no ESLint violations.
</verification>

<success_criteria>
- Toolbar buttons are 32px with rounded-full borders, 16px icons, no inline shortcut badges
- EditorPanel tab header is 44px tall with 12px text, clearly distinguishable active/inactive states
- Build and lint pass cleanly
</success_criteria>

<output>
After completion, create `.planning/quick/3-fix-toolbar-sizing-borders-and-merge-edi/3-SUMMARY.md`
</output>
