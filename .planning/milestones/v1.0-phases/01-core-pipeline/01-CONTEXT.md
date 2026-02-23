# Phase 1: Core Pipeline - Context

**Gathered:** 2026-02-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Delete the entire old visualization pipeline (compound nodes, TypeNode/RelationNode/PermissionNode, DirectEdge/ComputedEdge/TuplesetDepEdge, old fgaToFlow, old elk-layout). Replace with ERD schema cards, dimension detection, dimension-colored edges, 1-pass flat ELK layout, hover highlighting, minimap, and controls. Parser and editor untouched.

</domain>

<decisions>
## Implementation Decisions

### Card design & readability
- Compact row density — tight padding, maximize info per card, database schema viewer feel
- Inline symbolic expressions — operators as symbols, dimension refs annotated inline (e.g., `admin | director | ↗membership`). Code-like, compact
- Background shade bands to separate sections (bindings, relations, permissions) — each section gets a slightly different shade of the dark glass background, no explicit dividers
- Uniform dots for row icons — all rows use simple dots. Section banding + position distinguishes row types. No distinct shapes per type inside cards

### Edge visual style
- Subtle edges, cards dominate — thin edges (~1-1.5px), lower opacity. Cards are the primary visual element
- Arrowheads at target end, no labels — directional arrows show flow, no text on edges
- All edges solid — no dashed/dotted patterns. Type restrictions vs dimension edges distinguished by color alone (muted slate vs dimension colors)
- Dimension colors scale dynamically — generate colors programmatically for any dimension count. Every dimension gets its own color (colorblind-safe, dark-theme compatible)

### Hover & highlighting
- Opacity dim for non-relevant elements — drop to ~20-30% opacity during hover. Highlighted paths stay full opacity
- No extra effects on highlighted edges — just full opacity while others dim. No glow, no thickening
- Subtle background tint on participating rows — rows that are part of the hover path get a faint highlight background within their card
- Fast fade transition (~100-150ms) — quick but smooth, takes the edge off without feeling laggy

### Graph spacing & density
- Moderate breathing room — enough space between cards to clearly see edge routing, but not wasteful. Professional tool feel
- Content-adaptive card width — cards size to fit their longest row within min/max bounds. Better space efficiency, less uniform grid
- No minimum card height — a type with one binding renders as a tiny card. True to content, honest complexity representation
- Readable zoom as default — start at a zoom level where card text is readable, even if that means scrolling. Prioritize immediate readability over big-picture overview

### Claude's Discretion
- Exact pixel values for padding, margins, font sizes
- ELK spacing parameters (nodeSpacing, layerSpacing)
- Arrowhead size and shape
- Min/max bounds for content-adaptive card width
- Transition easing curves
- Exact opacity values for dimming (within ~20-30% range)
- Row highlight tint color and intensity

</decisions>

<specifics>
## Specific Ideas

- Cards should feel like a compact database schema viewer or ERD tool
- Expressions render inline with symbolic operators, not as separate pills or badges
- The graph should feel like a professional tool — not flashy, not sparse
- Edge routing should be clearly visible in the moderate spacing but edges don't compete with cards for attention

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-core-pipeline*
*Context gathered: 2026-02-22*
