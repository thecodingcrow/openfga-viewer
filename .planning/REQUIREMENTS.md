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
- [ ] **VIZ-09**: Subgraph enter/exit uses animated transitions (non-relevant cards fade, remaining animate to new positions)

### Data Model

- [x] **DATA-01**: Dimensions auto-detected from TTU tupleset patterns (group cross-type edges by structural binding)
- [x] **DATA-02**: All edges classified as either `type-restriction` (direct) or `dimension` (TTU)
- [x] **DATA-03**: Same-card dependencies (computed, tupleset-dep) rendered as expression text, not edges
- [x] **DATA-04**: Schema cards built from authorization graph with correct binding/relation/permission classification

### Interaction

- [x] **INT-01**: Hovering a permission row highlights upstream feeding paths without layout change (preview)
- [x] **INT-02**: Hovering a card header highlights downstream enabled paths without layout change (preview)
- [ ] **INT-03**: Clicking a permission row enters upstream subgraph -- removes non-relevant cards and re-lays out
- [ ] **INT-04**: Clicking a card header enters downstream subgraph -- removes non-relevant cards and re-lays out
- [ ] **INT-05**: Esc key or back button exits subgraph and returns to full graph
- [ ] **INT-06**: Cards can be collapsed to header-only via double-click, triggering re-layout

### Path Tracing

- [ ] **PATH-01**: In subgraph view, traced paths highlight specific expression terms in accent color (e.g., `admin | director | **MEMBER**`)
- [ ] **PATH-02**: Binding rows that enable TTU hops show bridge highlight indicator during trace
- [ ] **PATH-03**: Self-referencing dimensions show info icon with tooltip (e.g., "Permission can be inherited from parent categories")

### Controls

- [ ] **CTRL-01**: Dimension toggle chips in toolbar -- one per detected dimension, togglable on/off
- [ ] **CTRL-02**: Modifier+click on dimension chip for solo mode (show only that dimension's edges)
- [ ] **CTRL-03**: Type filtering shows/hides entire cards
- [ ] **CTRL-04**: Permissions-only toggle collapses relation sections on all cards
- [ ] **CTRL-05**: Command palette (Cmd+K) searches types, relations, permissions with card/row navigation
- [ ] **CTRL-06**: Legend shows dimension color key + row type icons (circle=relation, diamond=permission, dot=binding)
- [x] **CTRL-07**: Minimap for graph overview
- [x] **CTRL-08**: Controls panel for zoom/fit

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
| INT-03 | Phase 2 | Pending |
| INT-04 | Phase 2 | Pending |
| INT-05 | Phase 2 | Pending |
| INT-06 | Phase 2 | Pending |
| VIZ-09 | Phase 2 | Pending |
| PATH-01 | Phase 2 | Pending |
| PATH-02 | Phase 2 | Pending |
| PATH-03 | Phase 2 | Pending |
| CTRL-01 | Phase 2 | Pending |
| CTRL-02 | Phase 2 | Pending |
| CTRL-03 | Phase 2 | Pending |
| CTRL-04 | Phase 2 | Pending |
| CTRL-05 | Phase 2 | Pending |
| CTRL-06 | Phase 2 | Pending |

**Coverage:**
- v1 requirements: 30 total
- Mapped to phases: 30
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-22*
*Last updated: 2026-02-22 after roadmap restructure to 2 phases*
