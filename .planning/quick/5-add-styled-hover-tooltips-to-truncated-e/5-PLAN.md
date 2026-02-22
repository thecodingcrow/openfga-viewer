---
phase: quick-5
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/Tooltip.tsx
  - src/canvas/nodes/TypeCardNode.tsx
  - src/inspect/InspectPanel.tsx
autonomous: true
requirements: [QUICK-5]

must_haves:
  truths:
    - "Hovering a truncated expression on a type card row shows full text in a styled tooltip"
    - "Hovering a truncated expression on an inspector tree item shows full text in a styled tooltip"
    - "Tooltip does NOT appear when expression text is not truncated"
    - "Row-level hover highlighting (edge dim/highlight) still works correctly on type card rows"
    - "Row-level hover highlighting still works correctly on inspector tree items"
  artifacts:
    - path: "src/components/Tooltip.tsx"
      provides: "Reusable truncation-aware tooltip component"
      exports: ["TruncationTooltip"]
    - path: "src/canvas/nodes/TypeCardNode.tsx"
      provides: "TypeCardNode with tooltip on expression spans"
    - path: "src/inspect/InspectPanel.tsx"
      provides: "InspectPanel tree items with tooltip on expression spans"
  key_links:
    - from: "src/canvas/nodes/TypeCardNode.tsx"
      to: "src/components/Tooltip.tsx"
      via: "TruncationTooltip wrapping expression span"
      pattern: "TruncationTooltip"
    - from: "src/inspect/InspectPanel.tsx"
      to: "src/components/Tooltip.tsx"
      via: "TruncationTooltip wrapping expression span"
      pattern: "TruncationTooltip"
---

<objective>
Add styled hover tooltips that show full expression text when hovering truncated expressions on type card rows and inspector tree items.

Purpose: Expressions are truncated with text-ellipsis in both TypeCardNode rows and InspectPanel tree items. Users currently have no way to see the full expression without widening the card or panel. A styled tooltip solves this without layout changes.

Output: Reusable TruncationTooltip component integrated into both TypeCardNode and InspectPanel.
</objective>

<execution_context>
@/Users/thedoc/.claude/get-shit-done/workflows/execute-plan.md
@/Users/thedoc/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/Tooltip.tsx (will be created)
@src/canvas/nodes/TypeCardNode.tsx
@src/inspect/InspectPanel.tsx
@src/theme/colors.ts
@src/index.css
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create reusable TruncationTooltip component</name>
  <files>src/components/Tooltip.tsx</files>
  <action>
Create `src/components/Tooltip.tsx` exporting a `TruncationTooltip` component.

**Component API:**
```tsx
interface TruncationTooltipProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
}
```

The component renders a `<span>` with the text content, and manages its own tooltip visibility based on truncation detection.

**Truncation detection:**
- Use a `ref` on the rendered span element
- On `mouseenter`, check `el.scrollWidth > el.clientWidth`
- Only show tooltip when text IS truncated
- On `mouseleave`, hide tooltip

**Tooltip rendering:**
- Use React `createPortal` to render tooltip into `document.body` — this avoids `overflow: hidden` clipping from parent containers (TypeCardNode has `overflow-hidden` on the card and row divs)
- Position tooltip absolutely using `getBoundingClientRect()` of the span
- Default position: above the element, centered horizontally
- If tooltip would go above viewport top, flip to below

**Tooltip styling (dark theme matching app):**
- Background: `rgba(15, 23, 42, 0.98)` (matches card header bg)
- Border: `1px solid #2a3a5c` (matches `blueprint.surfaceBorder`)
- Text color: `#cbd5e1` (slate-300, matches expression text)
- Font: `ui-monospace, monospace` at `0.7rem` (matches expression font)
- Padding: `4px 8px`
- Border-radius: `6px`
- Box-shadow: `0 4px 12px rgba(0, 0, 0, 0.5)`
- `pointer-events: none` on the tooltip div (so it doesn't steal mouse events)
- `z-index: 9999` (above everything including React Flow overlays)
- `white-space: nowrap` (show full expression without wrapping)
- Max-width: `400px` with `white-space: normal; word-break: break-all` if the expression is extremely long

**CRITICAL — hover event isolation:**
The tooltip logic uses `onMouseEnter`/`onMouseLeave` on the expression `<span>` element ONLY. It must NOT add any mouse handlers to parent elements. The parent row `<div>` in both TypeCardNode and InspectPanel already has `onMouseEnter`/`onMouseLeave` for the hover-store highlight system. Since the expression span is a child of the row div, mouse events will still bubble up to the row -- the tooltip handlers and the row handlers operate independently.

**Do NOT:**
- Use the browser-native `title` attribute
- Use any external tooltip library
- Add any `onMouseEnter`/`onMouseLeave` to elements outside the expression span
- Use `stopPropagation()` on mouse events (this would break row hover highlighting)

The span itself should pass through the `className` and `style` props so it can be styled identically to the current expression spans.
  </action>
  <verify>
`npm run build` succeeds with no TypeScript errors. The component file exists and exports `TruncationTooltip`.
  </verify>
  <done>
TruncationTooltip component exists at `src/components/Tooltip.tsx`, is properly typed, uses portal rendering, detects truncation via scrollWidth/clientWidth, and does not interfere with parent mouse events.
  </done>
</task>

<task type="auto">
  <name>Task 2: Integrate TruncationTooltip into TypeCardNode and InspectPanel</name>
  <files>src/canvas/nodes/TypeCardNode.tsx, src/inspect/InspectPanel.tsx</files>
  <action>
**TypeCardNode.tsx — RowItemComponent (around line 332-336):**

Replace the expression span:
```tsx
{row.expression != null && (
  <span className="text-slate-500 ml-auto whitespace-nowrap overflow-hidden text-ellipsis min-w-0">
    {row.expression}
  </span>
)}
```

With:
```tsx
{row.expression != null && (
  <TruncationTooltip
    text={row.expression}
    className="text-slate-500 ml-auto whitespace-nowrap overflow-hidden text-ellipsis min-w-0"
  />
)}
```

Add the import at the top of the file:
```tsx
import { TruncationTooltip } from "../../components/Tooltip";
```

**InspectPanel.tsx — TreeItemComponent (around line 338-349):**

Replace the expression span:
```tsx
{node.expression != null && (
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
)}
```

With:
```tsx
{node.expression != null && (
  <TruncationTooltip
    text={node.expression}
    className="ml-1 whitespace-nowrap overflow-hidden text-ellipsis min-w-0 flex-1"
    style={{
      color: blueprint.muted,
      fontSize: "0.65rem",
      fontFamily: "ui-monospace, monospace",
    }}
  />
)}
```

Add the import at the top of the file:
```tsx
import { TruncationTooltip } from "../components/Tooltip";
```

**Verification that hover highlighting is preserved:**
- TypeCardNode's RowItemComponent has `onMouseEnter={onMouseEnter}` on the row div (line 285). The TruncationTooltip span is a child of this div. Mouse events on the span will bubble up to the row div, so `setHoveredRow` will still fire. The tooltip's own mouseenter/mouseleave handlers do NOT call `stopPropagation`.
- InspectPanel's TreeItemComponent has `onMouseEnter` on the row div (line 281). Same bubble-up behavior applies.
- The tooltip portal renders into `document.body` with `pointer-events: none`, so the tooltip itself never intercepts mouse events.
  </action>
  <verify>
`npm run build` succeeds. `npm run lint` passes. Verify that:
1. TypeCardNode.tsx imports TruncationTooltip and uses it for row expressions
2. InspectPanel.tsx imports TruncationTooltip and uses it for tree item expressions
3. Neither file has removed or modified the existing onMouseEnter/onMouseLeave handlers on row/tree-item divs
  </verify>
  <done>
Both TypeCardNode and InspectPanel use TruncationTooltip for expression display. Existing hover handlers on row/tree-item elements are untouched. Build and lint pass cleanly.
  </done>
</task>

</tasks>

<verification>
1. `npm run build` — no TypeScript errors
2. `npm run lint` — no ESLint errors
3. Manual test: load a model with long expressions. Hover over a truncated expression on a type card row — tooltip shows full text above the span. Move mouse away — tooltip disappears.
4. Manual test: same for inspector panel tree items.
5. Manual test: hover a NON-truncated expression (short text that fits) — NO tooltip appears.
6. Manual test: hover a type card row — edge/node highlighting still works (dims other cards, highlights connected edges). Verify this works BOTH when hovering the row name area AND when hovering the expression area.
7. Manual test: hover an inspector tree item — same highlighting behavior preserved.
</verification>

<success_criteria>
- Styled tooltip (dark bg, light text, monospace font) appears on hover over truncated expressions
- Tooltip does not appear for non-truncated text
- Works in both TypeCardNode rows and InspectPanel tree items
- Row-level hover highlighting (edge dim/highlight via hover-store) is unaffected
- Build and lint pass with zero errors
</success_criteria>

<output>
After completion, create `.planning/quick/5-add-styled-hover-tooltips-to-truncated-e/5-SUMMARY.md`
</output>
