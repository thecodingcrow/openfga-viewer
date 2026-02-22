---
phase: quick-2
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/toolbar/Toolbar.tsx
  - src/canvas/Breadcrumb.tsx
  - src/App.tsx
  - src/editor/EditorPanel.tsx
  - src/inspect/InspectPanel.tsx
  - src/store/viewer-store.ts
autonomous: true
requirements: [QUICK-2]
must_haves:
  truths:
    - "Toolbar renders at bottom-center of the viewport, visually larger than before"
    - "A single tabbed side panel contains both the FGA editor and the inspect tree"
    - "Toolbar has one panel toggle button that opens/closes the shared tabbed panel"
    - "Breadcrumb trail renders at top-left of the viewport"
    - "User can switch between Editor and Inspector tabs within the shared panel"
  artifacts:
    - path: "src/toolbar/Toolbar.tsx"
      provides: "Bottom-center toolbar with doubled icon/button size and single panel toggle"
    - path: "src/App.tsx"
      provides: "Updated layout composing shared panel instead of separate EditorPanel + InspectPanel"
    - path: "src/editor/EditorPanel.tsx"
      provides: "Shared tabbed panel with Editor and Inspector tabs"
    - path: "src/canvas/Breadcrumb.tsx"
      provides: "Breadcrumb positioned at top-left"
  key_links:
    - from: "src/toolbar/Toolbar.tsx"
      to: "src/store/viewer-store.ts"
      via: "panelOpen + togglePanel store actions"
      pattern: "togglePanel|panelOpen"
    - from: "src/editor/EditorPanel.tsx"
      to: "src/inspect/InspectPanel.tsx"
      via: "Tabbed container imports InspectPanel content"
      pattern: "activeTab.*inspect|editor"
---

<objective>
Restructure the UI layout: move toolbar to bottom-center with doubled size, merge editor and inspector into a single tabbed side panel toggled by one toolbar button, and relocate breadcrumb to top-left.

Purpose: Cleaner spatial layout -- toolbar at bottom as a dock, content panel on the side with tabs, breadcrumb where users expect navigation (top-left).
Output: Updated layout with toolbar at bottom, shared tabbed panel on left, breadcrumb at top-left.
</objective>

<execution_context>
@/Users/thedoc/.claude/get-shit-done/workflows/execute-plan.md
@/Users/thedoc/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/toolbar/Toolbar.tsx
@src/canvas/Breadcrumb.tsx
@src/App.tsx
@src/editor/EditorPanel.tsx
@src/inspect/InspectPanel.tsx
@src/store/viewer-store.ts
@src/index.css
</context>

<tasks>

<task type="auto">
  <name>Task 1: Consolidate store state and move breadcrumb to top-left</name>
  <files>
    src/store/viewer-store.ts
    src/canvas/Breadcrumb.tsx
  </files>
  <action>
**viewer-store.ts changes:**
- Replace separate `editorOpen` and `inspectOpen` booleans with a single `panelOpen: boolean` (default `true` to match current `editorOpen: true`).
- Add `panelTab: 'editor' | 'inspector'` state (default `'editor'`).
- Replace `toggleEditor` with `togglePanel: () => void` that toggles `panelOpen`.
- Replace `toggleInspect` with `setPanelTab: (tab: 'editor' | 'inspector') => void`.
- Keep `setEditorOpen` as `setPanelOpen: (open: boolean) => void` for programmatic control.
- Remove `inspectOpen` entirely. The inspect toggle button in toolbar will call `setPanelTab('inspector')` and ensure `panelOpen = true`.
- Keep `editorWidth` (renamed usage is fine, it controls the shared panel width). Keep `setEditorWidth`, `DEFAULT_EDITOR_WIDTH`.
- Keep `searchOpen`, `toggleSearch`, `setSearchOpen` unchanged.
- Update the `toggleEditor` keyboard shortcut handler in App.tsx (done in Task 3).

**Breadcrumb.tsx changes:**
- Change position from `bottom-4 left-3` to `top-4 left-3` (just change `bottom-4` to `top-4` in className).
- Keep z-index at 40, keep all other logic identical.
  </action>
  <verify>
Run `npm run build` -- no TypeScript errors. Grep for `editorOpen` and `inspectOpen` to confirm they are fully replaced (only `panelOpen` and `panelTab` remain in store).
  </verify>
  <done>Store has `panelOpen` + `panelTab` instead of separate `editorOpen`/`inspectOpen`. Breadcrumb renders at top-left.</done>
</task>

<task type="auto">
  <name>Task 2: Merge EditorPanel and InspectPanel into shared tabbed panel</name>
  <files>
    src/editor/EditorPanel.tsx
    src/inspect/InspectPanel.tsx
    src/App.tsx
  </files>
  <action>
**EditorPanel.tsx -- becomes the shared "SidePanel" (keep same file to minimize churn):**

Restructure EditorPanel.tsx to be a tabbed container holding both the editor and inspector content:

1. Import the InspectPanel's tree-building logic and components. The cleanest approach: extract the inspect panel's BODY content (everything below the header: filter input, tree area, footer) into an exported `InspectContent` component in InspectPanel.tsx that accepts no props (reads from store directly). Then EditorPanel imports `InspectContent`.

2. EditorPanel layout:
   - Same slide-in from left, same 480px width, same absolute positioning (left:0, top:0, bottom:0).
   - Uses `panelOpen` instead of `editorOpen` for visibility transform.
   - Header row: replace "FGA Model" title with two tab buttons: "Editor" and "Inspector".
     - Tab buttons: text-[10px] uppercase tracking-wide, active tab gets `blueprint.accent` color + bottom border accent, inactive gets `blueprint.muted`.
     - Right side of header: keep the close chevron button (calls `togglePanel`), keep the keyboard shortcut badge `Cmd+E`.
   - Below header: conditionally render `<FgaEditor />` when `panelTab === 'editor'` or `<InspectContent />` when `panelTab === 'inspector'`.
   - Keep parseError footer only when editor tab is active.

3. Update `toggleEditor` references to `togglePanel`.

**InspectPanel.tsx changes:**

Export a new `InspectContent` component that contains the filter input, tree area, and navigation footer -- everything currently inside InspectPanel except the outer positioned wrapper div and the header bar. The existing `InspectPanel` default export can remain but will no longer be used in App.tsx.

Actually, simpler: refactor InspectPanel.tsx so the default export IS the content (filter + tree + footer) without the outer shell (position, transform, background, header with close button). The outer shell is now handled by EditorPanel.tsx's tab container. Remove the header (title + close button) since that's now the tab bar in EditorPanel.

**App.tsx changes:**

- Remove `<InspectPanel />` from the render tree (it's now inside EditorPanel's tab).
- Keep `<EditorPanel />` (which is now the shared tabbed panel).
- Update `toggleEditor` references to `togglePanel` in the keyboard handler.
- Remove `inspectOpen` / `toggleInspect` imports if present.
  </action>
  <verify>
Run `npm run build` -- no TypeScript errors. Run `npm run dev`, open in browser: the left panel should show two tabs (Editor/Inspector), clicking each switches content. Close button hides the whole panel.
  </verify>
  <done>Single tabbed side panel with Editor and Inspector tabs. InspectPanel content renders inside the shared panel when Inspector tab is active. App.tsx no longer renders a separate InspectPanel.</done>
</task>

<task type="auto">
  <name>Task 3: Move toolbar to bottom-center and double its size</name>
  <files>
    src/toolbar/Toolbar.tsx
  </files>
  <action>
**Toolbar.tsx changes:**

1. **Position:** Change the toolbar container from `absolute top-4 left-1/2 -translate-x-1/2` to `absolute bottom-6 left-1/2 -translate-x-1/2`. Keep `z-50`, keep `hud-panel`, keep `border-radius: 9999` pill shape.

2. **Double the size:**
   - ToolbarButton: change `w-8 h-8` to `w-12 h-12`. Change `rounded-lg` to `rounded-xl`.
   - SVG icons inside buttons: change `width="14" height="14"` to `width="20" height="20"` (and scale viewBox if needed -- since viewBox stays `0 0 14 14`, the icons just render larger). Alternatively set `width="20" height="20" viewBox="0 0 14 14"` which scales them up proportionally.
   - Container padding: change `px-2 py-1.5` to `px-3 py-2`.
   - Gap: change `gap-1` to `gap-1.5`.
   - Separator: change `h-5` to `h-7`.
   - Keyboard shortcut badges: change `text-[9px]` to `text-[10px]`.

3. **Replace editor + inspect toggles with single panel toggle:**
   - Remove the separate "Toggle editor" button and the separate "Inspect panel" button.
   - Add a single "Toggle panel" button (using a sidebar/panel icon). When clicked, calls `togglePanel()`. Active state reflects `panelOpen`.
   - The icon: use a simple sidebar icon (two vertical rectangles, left one filled).

4. **Keep:** Search button (Cmd+K), Fit view button, Import button, GitHub button, CommandPalette. These are unchanged except for the size increase applied uniformly.

5. **Store references:** Replace `editorOpen` with `panelOpen`, `toggleEditor` with `togglePanel`, remove `inspectOpen`/`toggleInspect`.
  </action>
  <verify>
Run `npm run build` -- no TypeScript errors. Run `npm run dev`: toolbar renders at bottom-center, buttons are visibly larger, single panel toggle button opens/closes the tabbed side panel.
  </verify>
  <done>Toolbar renders at bottom-center with doubled button/icon sizes. Single panel toggle replaces separate editor/inspect buttons. All other toolbar functions (search, fit, import, GitHub) work at the new size.</done>
</task>

</tasks>

<verification>
1. `npm run build` passes with no errors
2. `npm run lint` passes (or only pre-existing warnings)
3. Visual check: toolbar is at bottom-center, noticeably larger than before
4. Visual check: breadcrumb appears at top-left when navigating into subgraph
5. Visual check: single panel on left with Editor/Inspector tabs, switchable
6. Keyboard shortcut Cmd+E toggles the panel open/closed
7. Keyboard shortcut Cmd+K still opens search
8. Esc still closes search or pops subgraph as before
</verification>

<success_criteria>
- Toolbar at bottom-center with ~2x larger buttons and icons
- Breadcrumb at top-left
- Single tabbed side panel replaces separate editor and inspector panels
- One toolbar button toggles the shared panel
- All existing functionality preserved (search, fit view, import, file drag-drop, keyboard shortcuts)
</success_criteria>

<output>
After completion, create `.planning/quick/2-move-toolbar-to-bottom-doubled-size-shar/2-SUMMARY.md`
</output>
