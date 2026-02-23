# Phase 3: Visual Refinement - Context

**Gathered:** 2026-02-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace AI-generated aesthetic ("AI slop") with a polished devtool design language across the entire app — cards, inspector, editor, toolbar, canvas. Enforce design tokens throughout (no magic px/color values). The parser, data pipeline, and interaction behaviors are untouched.

</domain>

<decisions>
## Implementation Decisions

### Design direction
- Target aesthetic: Linear — clean, minimal, professional
- Warm dark palette (Vercel-style off-blacks: `#111`, `#1a1a1a` territory), NOT cool/blue grays
- Mustard accent (`#d4a017`) kept as sole accent color
- Remove all per-type color coding — the `TYPE_PALETTE` rainbow colors are random and purposeless
- Remove type-colored accent bars (`borderTop: 3px solid ${accentColor}`) from cards entirely
- Kill the blue tint — the entire `blueprint` palette (`#0f1729`, `#1a2640`, `#2a3a5c`, etc.) must shift to warm neutrals
- Full theme across all surfaces: inspector panel, editor, cards, toolbar, canvas

### Card styling
- Elevated solid surface — remove glass/blur, slight frosting can remain
- Header: bottom border separator only (no accent bar, no different background)
- Section bands (binding/relation/permission): subtle 1px separator lines between sections + fix banding to neutral warm tones
- Section-coded dots — different neutral shade per section type (binding/relation/permission) for row scannability
- Current row density (`py-0.5`) stays — it's a data-dense tool

### Color palette & canvas
- Dot grid on canvas: keep, but shift to neutral warm tones (not blue)
- Dimension edge colors: keep but mute significantly — desaturated by default, visible on hover/select
- Edge weight: medium (1.5-2px), moderate opacity, always readable but not dominant
- Editor syntax highlighting: muted/desaturated theme (GitHub dark / One Dark Pro direction, lower saturation)
- Toolbar: dock to right side (macOS Dock concept), full revamp — no rounded/squishy AI slop, sharp and professional

### Typography & spacing
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

</decisions>

<specifics>
## Specific Ideas

- "The blue tint is the worst thing" — this is the #1 priority fix
- "Mixed fonts and the weird colored stripes on each card" — the rainbow accent bars are the most visible AI slop
- Toolbar should feel like macOS Dock — docked to right side, professional, not rounded/squishy
- "No AI slop allowed" — user is allergic to over-designed, gradient-heavy, glow-heavy aesthetics
- "We use modern Tailwind v4" — leverage `@theme` directive for all design tokens, no legacy config
- Enforce design tokens throughout — every color and spacing value must reference a token, no inline magic numbers

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-visual-refinement*
*Context gathered: 2026-02-22*
