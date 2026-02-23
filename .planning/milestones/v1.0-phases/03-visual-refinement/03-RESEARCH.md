# Phase 3: Visual Refinement - Research

**Researched:** 2026-02-22
**Domain:** Design system, CSS custom properties, Tailwind v4 theming, warm dark palette, CodeMirror theming
**Confidence:** HIGH

## Summary

This phase is a pure visual overhaul: shifting the entire app from a cool/blue "blueprint" palette to warm neutrals (Vercel/Linear aesthetic), removing per-type rainbow colors, replacing glass/blur card styling with elevated solid surfaces, standardizing all color and spacing values through CSS custom properties via Tailwind v4's `@theme`, and ensuring all-monospace typography.

The project already uses Tailwind v4 with `@theme` for color tokens in `index.css`, and a `blueprint` TS constant in `theme/colors.ts` that mirrors those tokens. The work is primarily about (1) replacing the cold blue hex values with warm neutral equivalents, (2) removing the `TYPE_PALETTE` and `getTypeColor()` usage from cards/search, (3) restyling components to use design tokens instead of hardcoded values, and (4) rebuilding the toolbar as a right-docked vertical bar.

**Primary recommendation:** Work in three layers: (1) define the new warm token palette in `@theme` + update the TS `blueprint` constant, (2) sweep all components to replace hardcoded colors with token references, (3) restyle individual surfaces (cards, toolbar, editor, inspector, canvas).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Target aesthetic: Linear — clean, minimal, professional
- Warm dark palette (Vercel-style off-blacks: `#111`, `#1a1a1a` territory), NOT cool/blue grays
- Mustard accent (`#d4a017`) kept as sole accent color
- Remove all per-type color coding — the `TYPE_PALETTE` rainbow colors are random and purposeless
- Remove type-colored accent bars (`borderTop: 3px solid ${accentColor}`) from cards entirely
- Kill the blue tint — the entire `blueprint` palette (`#0f1729`, `#1a2640`, `#2a3a5c`, etc.) must shift to warm neutrals
- Full theme across all surfaces: inspector panel, editor, cards, toolbar, canvas
- Elevated solid surface — remove glass/blur, slight frosting can remain
- Header: bottom border separator only (no accent bar, no different background)
- Section bands (binding/relation/permission): subtle 1px separator lines between sections + fix banding to neutral warm tones
- Section-coded dots — different neutral shade per section type (binding/relation/permission) for row scannability
- Current row density (`py-0.5`) stays — it's a data-dense tool
- Dot grid on canvas: keep, but shift to neutral warm tones (not blue)
- Dimension edge colors: keep but mute significantly — desaturated by default, visible on hover/select
- Edge weight: medium (1.5-2px), moderate opacity, always readable but not dominant
- Editor syntax highlighting: muted/desaturated theme (GitHub dark / One Dark Pro direction, lower saturation)
- Toolbar: dock to right side (macOS Dock concept), full revamp — no rounded/squishy AI slop, sharp and professional
- All monospace throughout — no mixed fonts, it's a dev tool
- Design tokens: CSS custom properties only via Tailwind v4 `@theme` — single source of truth, no TS const color/spacing objects
- Type scale: use Tailwind's built-in levels (`text-xs`, `text-sm`, `text-base`, etc.) — constrained professional subset, no arbitrary `text-[Npx]` values
- Enforce consistent sizing across inspector, editor, and cards

### Claude's Discretion
- Exact warm neutral hex values for the new palette
- Which Tailwind type scale levels to use for each UI element
- Frosting intensity on card surfaces
- Exact desaturation level for muted dimension edge colors
- Syntax highlighting color choices within the "muted" constraint
- Toolbar icon set and exact dock layout
- Section dot shade values per section type

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tailwind CSS | ^4.2.0 | Utility classes + `@theme` design tokens | Already in project; v4 `@theme` is the official way to define CSS custom properties |
| CodeMirror 6 | ^6.39.14 | Editor theming via `EditorView.theme()` + `HighlightStyle.define()` | Already in project; standard CM6 theming API |

### Supporting
No new libraries needed. This phase uses only existing dependencies.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS custom properties | TS const objects | User explicitly locked "CSS custom properties only via @theme" — TS consts are being removed |
| Tailwind type scale utilities | Arbitrary `text-[Npx]` | User explicitly locked to Tailwind's built-in levels |

**Installation:**
No new packages required.

## Architecture Patterns

### Recommended Project Structure

The existing structure stays. Key files affected:

```
src/
├── index.css              # @theme tokens (PRIMARY source of truth)
├── theme/
│   ├── colors.ts          # REMOVE blueprint TS const; replace with CSS var references
│   └── dimensions.ts      # KEEP dimension palette (colorblind-safe, separate concern)
├── canvas/
│   ├── FgaGraph.tsx        # Update Background color, MiniMap/Controls styles
│   ├── Canvas.tsx          # Update empty-state styling
│   ├── Breadcrumb.tsx      # Update to use tokens
│   ├── nodes/TypeCardNode.tsx  # Major restyle: remove accent bar, solid surface, section separators
│   └── edges/DimensionEdge.tsx # Mute default opacity, adjust stroke width
├── editor/
│   ├── EditorPanel.tsx     # Update panel bg, border, tab styling
│   ├── fga-theme.ts        # Full rewrite: muted/desaturated syntax colors
│   └── FgaEditor.tsx       # (minimal changes, just theme import)
├── toolbar/
│   ├── Toolbar.tsx         # Full rewrite: right-docked vertical dock layout
│   └── CommandPalette.tsx  # Update to use tokens, remove getTypeColor
├── inspect/
│   └── InspectPanel.tsx    # Update to use tokens, remove getTypeColor
├── components/
│   ├── Tooltip.tsx         # Update hardcoded colors to tokens
│   └── ResizeHandle.tsx    # Update to use tokens
└── App.tsx                 # Update alpha banner styling
```

### Pattern 1: Single Source of Truth via @theme

**What:** Define ALL colors as CSS custom properties in `index.css` under `@theme`. Reference them everywhere via `var(--color-*)` in TS/JSX inline styles, or via Tailwind utility classes like `bg-surface`, `text-muted`, etc.

**When to use:** Every color value in the codebase.

**Example:**
```css
/* index.css */
@import "tailwindcss";

@theme {
  /* Backgrounds */
  --color-bg: #111111;
  --color-surface: #1a1a1a;
  --color-surface-raised: #222222;
  --color-surface-overlay: #282828;

  /* Borders */
  --color-border: #2e2e2e;
  --color-border-subtle: #252525;

  /* Text */
  --color-text-primary: #e5e5e5;
  --color-text-secondary: #a3a3a3;
  --color-text-muted: #737373;

  /* Accent */
  --color-accent: #d4a017;

  /* Feedback */
  --color-danger: #ef4444;

  /* Canvas */
  --color-dot-grid: #252525;
}
```

```typescript
// In components — reference CSS variables directly
<div style={{ background: 'var(--color-surface)' }}>
// OR use Tailwind utilities (auto-generated from @theme)
<div className="bg-surface text-text-primary">
```

**Confidence:** HIGH — verified via Context7 that Tailwind v4 `@theme` generates both CSS custom properties AND utility classes from the `--color-*` namespace.

### Pattern 2: Eliminate TS Color Constants

**What:** Remove the `blueprint` const from `theme/colors.ts` entirely. All components currently importing `blueprint.bg`, `blueprint.muted`, etc. switch to either:
- CSS `var(--color-*)` in inline styles
- Tailwind utility classes

**When to use:** During the token migration sweep.

**Why:** The user locked "CSS custom properties only via Tailwind v4 `@theme` — single source of truth, no TS const color/spacing objects." The current dual system (`@theme` in CSS + `blueprint` in TS) violates this.

**Migration path for `blueprint` references (66 occurrences across 8 files):**

| Current TS Reference | New CSS Variable | Tailwind Class |
|----------------------|-----------------|----------------|
| `blueprint.bg` | `var(--color-bg)` | `bg-bg` |
| `blueprint.surface` | `var(--color-surface)` | `bg-surface` |
| `blueprint.nodeBg` | `var(--color-surface-raised)` | `bg-surface-raised` |
| `blueprint.nodeBorder` | `var(--color-border)` | `border-border` |
| `blueprint.nodeHeader` | `var(--color-text-primary)` | `text-text-primary` |
| `blueprint.nodeBody` | `var(--color-text-secondary)` | `text-text-secondary` |
| `blueprint.muted` | `var(--color-text-muted)` | `text-text-muted` |
| `blueprint.accent` | `var(--color-accent)` | `text-accent` |
| `blueprint.danger` | `var(--color-danger)` | `text-danger` |
| `blueprint.edgeStroke` | `var(--color-border)` | — |
| `blueprint.surfaceBorder` | `var(--color-border-subtle)` | `border-border-subtle` |

### Pattern 3: CodeMirror Theme from CSS Variables

**What:** CodeMirror's `EditorView.theme()` accepts plain CSS property values. These can reference CSS custom properties via `var(--color-*)`.

**Example:**
```typescript
// Source: CodeMirror docs — EditorView.theme() accepts any valid CSS value
const editorTheme = EditorView.theme({
  "&": {
    backgroundColor: "var(--color-surface)",
    color: "var(--color-text-secondary)",
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
    color: "var(--color-text-muted)",
  },
}, { dark: true });
```

**Confidence:** HIGH — CodeMirror theme objects just produce CSS, so `var()` references work fine.

### Pattern 4: Muted Syntax Highlighting

**What:** Replace the current saturated syntax colors with desaturated equivalents. Target: GitHub Dark / One Dark Pro direction but lower saturation.

**Current vs. proposed highlight colors:**

| Token | Current | Proposed (muted) | Notes |
|-------|---------|-------------------|-------|
| keyword | `#c084fc` (bright purple) | `#b098d4` (dusty lavender) | Lower chroma |
| typeName | `#7dd3fc` (bright cyan) | `#e5e5e5` (primary text) | Types are primary content |
| variableName | `#67e8f9` (bright cyan) | `#9cc4c4` (muted teal) | Readable but not glowing |
| operator | `#fb923c` (bright orange) | `#c8a070` (warm sand) | Warm but subdued |
| bracket | `#fbbf24` (bright yellow) | `#a3a3a3` (neutral) | Brackets fade to background |
| number | `#34d399` (bright green) | `#8fb8a0` (sage) | Desaturated green |
| comment | `#64748b` (slate) | `#737373` (warm neutral muted) | Shift from blue-gray |
| string | `#86efac` (bright green) | `#a4c99e` (soft green) | Desaturated |

**Confidence:** MEDIUM — exact color values are Claude's discretion, but the direction (lower saturation, warmer) is locked.

### Anti-Patterns to Avoid
- **Hardcoded hex in JSX:** Never add a new `#hexcode` to component files. Always reference a `@theme` token.
- **Mixing token systems:** Don't create new TS const objects alongside `@theme`. One source of truth.
- **Over-abstracting:** Don't create semantic token layers beyond what the UI needs. Keep it flat: `--color-bg`, `--color-surface`, `--color-text-primary`, etc.
- **Breaking dimension colors:** The DIMENSION_PALETTE (Paul Tol's Muted) serves a functional purpose (colorblind-safe edge disambiguation). Do NOT replace these with the warm palette. They stay as-is but get desaturated rendering at default opacity.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Design token system | Custom token resolver or theme context | Tailwind v4 `@theme` + CSS custom properties | Built into the framework, generates utilities automatically |
| Dark mode detection | Manual `prefers-color-scheme` handling | Not needed — single dark theme app | The app is always dark |
| Color manipulation (desaturation) | Runtime color math library | Pre-computed hex values in `@theme` | Static palette, no dynamic color math needed |

**Key insight:** This phase requires zero new dependencies. Everything is achievable with Tailwind v4's `@theme`, CSS custom properties, and CodeMirror's built-in theming API.

## Common Pitfalls

### Pitfall 1: Tailwind v4 @theme Namespace Convention
**What goes wrong:** Defining tokens with wrong namespace prefix causes Tailwind to not generate utility classes.
**Why it happens:** Tailwind v4 maps `--color-*` to `bg-*`, `text-*`, etc. Other namespaces include `--font-*`, `--spacing-*`, etc.
**How to avoid:** Always use `--color-{name}` for colors. Verify utility generation by checking that `bg-{name}` works.
**Warning signs:** Tailwind utility class has no effect; only the `var()` reference works.

### Pitfall 2: Inline Style Opacity with CSS Variables
**What goes wrong:** Can't do `background: var(--color-surface) + "80"` for alpha. CSS variables don't concatenate with hex alpha.
**Why it happens:** CSS custom properties are substituted as-is; they don't support string concatenation.
**How to avoid:** For alpha variants, either (a) define separate tokens like `--color-surface-alpha: rgba(26, 26, 26, 0.95)`, or (b) use `color-mix()` in CSS, or (c) use Tailwind opacity modifiers like `bg-surface/80`. Tailwind v4 supports the `/opacity` modifier syntax with @theme colors.
**Warning signs:** `${blueprint.accent}15` pattern (appending hex alpha to a TS string) — this won't work with CSS variables.

### Pitfall 3: CodeMirror Theme Isolation
**What goes wrong:** CodeMirror themes use scoped class selectors. If you change colors in `@theme` but forget to update `fga-theme.ts`, the editor stays on old colors.
**Why it happens:** `EditorView.theme()` generates its own scoped CSS classes — they don't inherit from Tailwind utilities.
**How to avoid:** Update `fga-theme.ts` explicitly to use `var(--color-*)` references. Test editor appearance separately.
**Warning signs:** Editor looks blue/cold while rest of app is warm.

### Pitfall 4: `rgba()` Hardcoded Values Throughout Components
**What goes wrong:** There are 8+ files with hardcoded `rgba(15, 23, 42, ...)` values (the old cold blue). A palette swap in `@theme` won't catch these.
**Why it happens:** Components use inline styles with hardcoded rgba values instead of token references.
**How to avoid:** Do a full sweep of `rgba(15, 23, 4` and `#0f172` patterns. Replace each with a CSS variable reference.
**Warning signs:** Card backgrounds, panel backgrounds, and tooltip backgrounds still appear blue after token swap.

### Pitfall 5: Removing TYPE_PALETTE Breaks Command Palette Icons
**What goes wrong:** `CommandPalette.tsx` and `InspectPanel.tsx` use `getTypeColor()` for per-type colored dots in search results and tree view.
**Why it happens:** The rainbow type colors are used for visual grouping in search, not just cards.
**How to avoid:** When removing `TYPE_PALETTE`, replace the per-type dot in CommandPalette/InspectPanel with the accent color or a single neutral dot. The user wants "remove all per-type color coding."
**Warning signs:** Search results lose all visual grouping.

### Pitfall 6: `accentColor` Field in SchemaCard Type
**What goes wrong:** The `SchemaCard` type has an `accentColor` field set from `getTypeColor()`. Removing the colored accent bar doesn't remove the data flow.
**Why it happens:** `fgaToFlow.ts` still calls `getTypeColor(typeName)` and passes it as `accentColor`.
**How to avoid:** Remove `accentColor` from `SchemaCard` type, remove it from `fgaToFlow.ts`, and remove the usage in `TypeCardNode.tsx`. Clean up the whole chain.
**Warning signs:** TypeScript compile errors or unused code warnings.

### Pitfall 7: Toolbar Layout Change Affects Command Palette
**What goes wrong:** Moving the toolbar from bottom-center horizontal to right-side vertical dock may break the CommandPalette positioning or keyboard shortcut flow.
**Why it happens:** CommandPalette is rendered inside Toolbar.tsx as a sibling. Its positioning is absolute/fixed and independent, but the parent container context changes.
**How to avoid:** CommandPalette is `fixed` positioned (top 20vh, centered). It should remain independent of toolbar position. Verify it still renders correctly after toolbar move.
**Warning signs:** CommandPalette appears behind the new toolbar or in wrong position.

## Code Examples

### Warm Dark Palette Definition (Recommended)

```css
/* index.css — @theme tokens for warm dark palette */
@import "tailwindcss";

@theme {
  /* ── Backgrounds ─────────────────────────────── */
  --color-bg: #111111;
  --color-surface: #191919;
  --color-surface-raised: #222222;
  --color-surface-overlay: #282828;

  /* ── Borders ─────────────────────────────────── */
  --color-border: #2e2e2e;
  --color-border-subtle: #242424;

  /* ── Text ────────────────────────────────────── */
  --color-text-primary: #ebebeb;
  --color-text-secondary: #a0a0a0;
  --color-text-muted: #666666;

  /* ── Accent ──────────────────────────────────── */
  --color-accent: #d4a017;

  /* ── Feedback ────────────────────────────────── */
  --color-danger: #ef4444;

  /* ── Canvas ──────────────────────────────────── */
  --color-dot-grid: #222222;

  /* ── Section dots (per-section neutral shades) ── */
  --color-dot-binding: #a0a0a0;
  --color-dot-relation: #777777;
  --color-dot-permission: #555555;
}
```

### Card Restyle (TypeCardNode pattern)

```tsx
// BEFORE: glass + accent bar
<div style={{
  background: "rgba(15, 23, 42, 0.85)",
  backdropFilter: "blur(8px)",
}}>
  <div style={{ borderTop: `3px solid ${d.accentColor}` }}>

// AFTER: solid surface + bottom border separator
<div style={{
  background: "var(--color-surface-raised)",
  border: "1px solid var(--color-border)",
}}>
  <div style={{ borderBottom: "1px solid var(--color-border)" }}>
```

### Toolbar Dock (right-side vertical)

```tsx
// Vertical dock pinned to right edge
<div
  className="absolute right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-1 px-1.5 py-2"
  style={{
    background: "var(--color-surface-overlay)",
    border: "1px solid var(--color-border)",
    borderRadius: 8,
  }}
>
  {/* Vertical stack of icon buttons */}
</div>
```

### CSS Variable in CodeMirror Theme

```typescript
const editorTheme = EditorView.theme({
  "&": {
    backgroundColor: "var(--color-surface)",
    color: "var(--color-text-secondary)",
    fontSize: "0.8125rem",
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
    color: "var(--color-text-muted)",
    border: "none",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(212, 160, 23, 0.04)",
  },
}, { dark: true });
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tailwind v3 `tailwind.config.js` + `theme.extend.colors` | Tailwind v4 `@theme` directive in CSS | Tailwind v4 (2024) | Tokens live in CSS, not JS config. Auto-generates both utilities and CSS vars |
| Dual TS const + CSS vars | CSS custom properties only | Phase 3 (this phase) | Single source of truth eliminates sync bugs |

**Deprecated/outdated:**
- `tailwind.config.js` / `tailwind.config.ts` — replaced by `@theme` in Tailwind v4
- TS color const objects as token source — being eliminated in this phase

## Surface Inventory (Complete Audit)

Every file that references colors and needs updating:

| File | `blueprint.*` refs | Hardcoded hex/rgba | `getTypeColor` | Priority |
|------|--------------------|--------------------|-----------------|----------|
| `src/index.css` | — | 15 (theme tokens + `.hud-panel` + `.scrollbar-dark`) | — | 1 (tokens) |
| `src/theme/colors.ts` | 15 (definition site) | 25 | Yes (definition) | 1 (tokens) |
| `src/canvas/nodes/TypeCardNode.tsx` | — | 3 (`rgba`, hex) | — (uses `accentColor` from data) | 2 (cards) |
| `src/canvas/edges/DimensionEdge.tsx` | — | — | — | 2 (edges) |
| `src/canvas/FgaGraph.tsx` | — | 4 (`#1e3a5c`, `#2a3a5c`, `#334155`, `rgba`) | — | 2 (canvas) |
| `src/canvas/Canvas.tsx` | 2 | — | — | 2 |
| `src/canvas/Breadcrumb.tsx` | 3 | — | — | 2 |
| `src/editor/fga-theme.ts` | 20 | 6 (syntax colors) | — | 3 (editor) |
| `src/editor/EditorPanel.tsx` | 11 | — | — | 3 |
| `src/toolbar/Toolbar.tsx` | 5 | — | — | 4 (toolbar) |
| `src/toolbar/CommandPalette.tsx` | 12 | 1 | Yes | 4 |
| `src/inspect/InspectPanel.tsx` | 8 | 7 | Yes | 3 |
| `src/components/Tooltip.tsx` | — | 2 | — | 3 |
| `src/components/ResizeHandle.tsx` | 5 | — | — | 3 |
| `src/canvas/fgaToFlow.ts` | — | — | Yes (accentColor) | 2 |
| `src/App.tsx` | — | 2 (`#1a1a2e`, `#f59e0b`) | — | 5 |
| `src/types.ts` | — | — | — | 2 (remove `accentColor` from `SchemaCard`) |

**Total: 16 files, ~75 hardcoded hex occurrences, 66 `blueprint.*` references, 4 `getTypeColor` call sites.**

## Execution Order Recommendation

The planner should structure tasks in this dependency order:

1. **Token layer** — Define new warm palette in `@theme`, update/remove `blueprint` TS const, update `theme/colors.ts`
2. **Type cleanup** — Remove `accentColor` from `SchemaCard` type, `fgaToFlow.ts`, and `TypeCardNode.tsx`
3. **Card restyle** — `TypeCardNode.tsx`: solid surface, bottom-border header, section separators, section dots
4. **Canvas + edges** — `FgaGraph.tsx`: warm dot grid, MiniMap/Controls styles. `DimensionEdge.tsx`: muted default opacity
5. **Editor theme** — `fga-theme.ts`: muted syntax colors via CSS vars. `EditorPanel.tsx`: warm panel
6. **Inspector** — `InspectPanel.tsx`: warm tokens, remove type colors from tree
7. **Toolbar** — `Toolbar.tsx`: right-docked vertical layout. Verify CommandPalette positioning
8. **Remaining surfaces** — `Breadcrumb.tsx`, `Tooltip.tsx`, `ResizeHandle.tsx`, `Canvas.tsx`, `App.tsx`
9. **HUD panel + scrollbar** — Update `.hud-panel` and `.scrollbar-dark` CSS classes in `index.css`

## Open Questions

1. **Tailwind opacity modifier with @theme colors**
   - What we know: Tailwind v4 supports `bg-surface/80` syntax for applying opacity to theme colors
   - What's unclear: Whether this works correctly with hex-defined colors (vs oklch). The current codebase uses patterns like `${blueprint.accent}15` which appends hex alpha. Need to verify equivalent Tailwind v4 approach works.
   - Recommendation: Test `bg-accent/10` modifier after defining `--color-accent: #d4a017`. If it works, use it everywhere. If not, define explicit alpha variants as separate tokens.

2. **Dimension palette desaturation mechanism**
   - What we know: Dimension colors (Paul Tol's Muted) should be "muted significantly — desaturated by default, visible on hover/select"
   - What's unclear: Whether to desaturate the palette values themselves, or use CSS opacity/filter, or define two sets (dim + vivid)
   - Recommendation: Use lower default opacity on edges (currently 0.6 → reduce to ~0.35) and increase to full on hover. This preserves the colorblind-safe palette while muting the visual weight. No need to change the palette hex values.

3. **`getTypeColor` removal scope in CommandPalette**
   - What we know: The user wants to "remove all per-type color coding"
   - What's unclear: Whether search result grouping in CommandPalette should use accent color for ALL type dots, or section-coded neutral shades, or no dots at all
   - Recommendation: Use the accent color for type-level items and neutral dots for relation/permission items, matching the card pattern.

## Sources

### Primary (HIGH confidence)
- Context7 `/websites/tailwindcss` — `@theme` directive, CSS custom property generation, color namespace conventions
- Context7 `/websites/codemirror_net` — `EditorView.theme()` API, `HighlightStyle.define()` usage, dark mode flag
- Codebase analysis — All 16 affected files read and audited for color references

### Secondary (MEDIUM confidence)
- Warm dark palette values — Claude's discretion based on Vercel/Linear design direction. Exact hex values should be verified visually during implementation.
- Syntax highlighting colors — Proposed muted values based on GitHub Dark/One Dark Pro inspiration, but exact values are Claude's discretion.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — No new deps, existing Tailwind v4 + CodeMirror APIs well-documented
- Architecture: HIGH — Pattern (CSS custom properties via @theme) verified with Context7 docs
- Surface inventory: HIGH — Complete audit of all 16 files with exact occurrence counts
- Color values: MEDIUM — Exact hex values are discretionary; direction is locked
- Pitfalls: HIGH — Identified from direct codebase analysis of current patterns

**Research date:** 2026-02-22
**Valid until:** 2026-03-22 (stable — no moving-target dependencies)
