# Requirements: OpenFGA Viewer -- Visual Overhaul

**Defined:** 2026-02-22
**Core Value:** The graph must be immediately readable -- a user looking at it should see how access flows through types, relations, and permissions without untangling spaghetti edges or guessing what connects to what.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Visualization

- [x] **VIZ-01**: Types render as ERD schema cards with binding (ownership), relation, and permission sections
- [x] **VIZ-02**: Binding rows show dimension-colored dot indicator identifying which structural dimension they create
- [x] **VIZ-03**: Permission rows display readable expressions with `↗dimension` notation for cross-type access channels
- [x] **VIZ-04**: Cross-card edges use dimension-specific colors (categorical palette, colorblind-safe, dark-theme compatible)
- [x] **VIZ-05**: Type restriction edges (direct) use muted slate styling distinct from dimension edges
- [x] **VIZ-06**: Graph uses 1-pass flat ELK layout with orthogonal edge routing (replaces 3-pass compound system)
- [x] **VIZ-07**: Layout supports TB and LR direction toggle
- [x] **VIZ-08**: Cards use dark glass styling (`bg-slate-900/85`, rounded-xl, type-colored accent bar)
- [x] **VIZ-09**: Subgraph enter/exit uses animated transitions (non-relevant cards fade, remaining animate to new positions)

### Data Model

- [x] **DATA-01**: Dimensions auto-detected from TTU tupleset patterns (group cross-type edges by structural binding)
- [x] **DATA-02**: All edges classified as either `type-restriction` (direct) or `dimension` (TTU)
- [x] **DATA-03**: Same-card dependencies (computed, tupleset-dep) rendered as expression text, not edges
- [x] **DATA-04**: Schema cards built from authorization graph with correct binding/relation/permission classification

### Interaction

- [x] **INT-01**: Hovering a permission row highlights upstream feeding paths without layout change (preview)
- [x] **INT-02**: Hovering a card header highlights downstream enabled paths without layout change (preview)
- [x] **INT-03**: Clicking a permission row enters upstream subgraph -- removes non-relevant cards and re-lays out
- [x] **INT-04**: Clicking a card header enters downstream subgraph -- removes non-relevant cards and re-lays out
- [x] **INT-05**: Esc key or back button exits subgraph and returns to full graph
- [x] **INT-06**: Cards can be collapsed to header-only via double-click, triggering re-layout

### Path Tracing

- [ ] **PATH-01**: In subgraph view, traced paths highlight specific expression terms in accent color (e.g., `admin | director | **MEMBER**`)
- [ ] **PATH-02**: Binding rows that enable TTU hops show bridge highlight indicator during trace
- [x] **PATH-03**: Self-referencing dimensions show info icon with tooltip (e.g., "Permission can be inherited from parent categories")

### Controls

- [x] **CTRL-01**: Dimension toggle chips in toolbar -- one per detected dimension, togglable on/off
- [x] **CTRL-02**: Modifier+click on dimension chip for solo mode (show only that dimension's edges)
- [x] **CTRL-03**: Type filtering shows/hides entire cards
- [x] **CTRL-04**: Permissions-only toggle collapses relation sections on all cards
- [x] **CTRL-05**: Command palette (Cmd+K) searches types, relations, permissions with card/row navigation
- [x] **CTRL-06**: Legend shows dimension color key + row type icons (circle=relation, diamond=permission, dot=binding)
- [x] **CTRL-07**: Minimap for graph overview
- [x] **CTRL-08**: Controls panel for zoom/fit

### Theme & Design System

- [ ] **THEME-01**: Warm dark palette (Vercel-style off-blacks #111/#1a1a territory) replaces cool blue blueprint palette via CSS custom properties in @theme
- [ ] **THEME-02**: All per-type color coding removed -- TYPE_PALETTE, getTypeColor, accentColor eliminated entirely
- [ ] **THEME-03**: Cards use elevated solid surfaces with bottom-border headers, 1px section separators, and section-coded neutral dots
- [ ] **THEME-04**: Canvas dot grid, MiniMap, and Controls use warm neutral tones (no blue tint)
- [ ] **THEME-05**: Dimension edges muted by default (~0.35 opacity), vivid on hover/select; edge weight 1.5-2px
- [ ] **THEME-06**: Editor syntax highlighting uses muted/desaturated colors (GitHub Dark / One Dark Pro direction)
- [ ] **THEME-07**: Toolbar docked to right side as vertical bar (macOS Dock concept), sharp and professional
- [ ] **THEME-08**: All monospace typography throughout; Tailwind type scale levels only (no arbitrary text-[Npx])
- [ ] **THEME-09**: Design tokens enforced -- every color references CSS custom properties via @theme, no hardcoded hex in components

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Export & Sharing

- **EXPORT-01**: SVG/PNG export of current graph view
- **SHARE-01**: URL hash encoding of filters, subgraph state, and layout direction

### Performance

- **PERF-01**: Semantic zoom -- level of detail based on zoom level (collapse detail at far zoom)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Backend/API integration | Client-only tool -- paste and explore |
| Real-time collaboration | Single-user tool |
| TTU edge rendering | Intentionally hidden -- drives dimension model instead |
| Mobile/touch support | Desktop tool with mouse interaction |
| Test suite | Separate concern from visual overhaul |
| CI/CD pipeline | Separate concern |
| Accessibility (a11y) | Future milestone |
| Graph editing (visual authoring) | Conflicts with core "paste and explore" UX |
| Tuple/data management | Not a visualization concern |
| Compound expand/collapse | Eliminated by ERD card architecture |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 1 | Complete |
| DATA-02 | Phase 1 | Complete |
| DATA-03 | Phase 1 | Complete |
| DATA-04 | Phase 1 | Complete |
| VIZ-01 | Phase 1 | Complete |
| VIZ-02 | Phase 1 | Complete |
| VIZ-03 | Phase 1 | Complete |
| VIZ-04 | Phase 1 | Complete |
| VIZ-05 | Phase 1 | Complete |
| VIZ-06 | Phase 1 | Complete |
| VIZ-07 | Phase 1 | Complete |
| VIZ-08 | Phase 1 | Complete |
| INT-01 | Phase 1 | Complete |
| INT-02 | Phase 1 | Complete |
| CTRL-07 | Phase 1 | Complete |
| CTRL-08 | Phase 1 | Complete |
| INT-03 | Phase 2 | Complete |
| INT-04 | Phase 2 | Complete |
| INT-05 | Phase 2 | Complete |
| INT-06 | Phase 2 | Complete |
| VIZ-09 | Phase 2 | Complete |
| PATH-01 | Phase 2 | Pending |
| PATH-02 | Phase 2 | Pending |
| PATH-03 | Phase 2 | Complete |
| CTRL-01 | Phase 2 | Complete |
| CTRL-02 | Phase 2 | Complete |
| CTRL-03 | Phase 2 | Complete |
| CTRL-04 | Phase 2 | Complete |
| CTRL-05 | Phase 2 | Complete |
| CTRL-06 | Phase 2 | Complete |

| THEME-01 | Phase 3 | Pending |
| THEME-02 | Phase 3 | Pending |
| THEME-03 | Phase 3 | Pending |
| THEME-04 | Phase 3 | Pending |
| THEME-05 | Phase 3 | Pending |
| THEME-06 | Phase 3 | Pending |
| THEME-07 | Phase 3 | Pending |
| THEME-08 | Phase 3 | Pending |
| THEME-09 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 39 total
- Mapped to phases: 39
- Unmapped: 0

---
*Requirements defined: 2026-02-22*
*Last updated: 2026-02-22 after Phase 3 planning*
