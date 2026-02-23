# Phase 2: Interaction & Polish - Context

**Gathered:** 2026-02-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Add exploration, filtering, search, and UI theming to the ERD card visualization. Users can navigate subgraphs, inspect dependency trees, search via command palette, collapse cards, and experience a cohesive HUD-style interface. Hover highlighting from Phase 1 stays as-is. Path tracing + access query is deferred to Phase 3.

</domain>

<decisions>
## Implementation Decisions

### Subgraph exploration
- Click a permission row to enter upstream subgraph; click a card header to enter downstream subgraph
- Downstream subgraph shows full transitive reach (all types reachable, not just direct neighbors)
- Transition: non-relevant cards fade out first, then remaining cards animate to new ELK-computed positions (two-phase)
- Unlimited nesting — subgraph stack grows with each drill-in
- Breadcrumb trail in bottom-left corner shows full navigation path; each segment is clickable to jump back
- Esc key pops one level; breadcrumb clicks jump to any level
- Browser history integration — each drill-in pushes state, browser back button also pops a level
- After transition, auto-fit viewport to show all remaining cards centered
- Cards in subgraph show ALL rows, but irrelevant rows are dimmed (~40% opacity)
- Toggle in UI to hide dimmed rows for compact view (opt-in)

### Inspect panel
- Replaces legend (CTRL-06 killed) and dimension toggles (CTRL-01, CTRL-02 killed)
- Magnifying glass icon in toolbar toggles a right-side panel open/closed
- Panel shows a collapsible, interactive tree breakdown of the authorization model
- At full graph: all types shown as root-level collapsible nodes
- In subgraph: tree re-roots to show current subgraph's root as the tree root
- Each tree node shows name + expression (e.g., `document#can_view: admin | editor | member`)
- Tree nodes are dimension-colored (matching edge colors from the graph)
- Clicking a tree node navigates into that node's subgraph; panel stays open and tree re-roots
- Hovering a tree node highlights the corresponding card/row on the canvas
- Filter input at top of panel for quick text search within the tree
- Panel overlays on top of the canvas (no canvas resize)

### Command palette
- Cmd+K opens center-screen overlay (classic command palette style with backdrop dim)
- Fuzzy matching (like VS Code — abbreviated input matches across the full name)
- Results grouped by type card (type name as group header)
- Each result shows row type icons (circle=relation, diamond=permission) + dimension color dot
- Selecting a result enters the subgraph for that node
- Shows last 5 recently visited nodes when opened with empty input
- Full keyboard navigation: arrow keys move selection, Enter confirms, Esc closes
- Search only — no actions (no "collapse all", "reset view", etc.)

### Card collapse
- Double-click a card header to collapse it to header-only
- Collapse triggers ELK re-layout (other cards shift to fill reclaimed space)
- Per-card only — no collapse-all / expand-all action

### Recursive hierarchy indicators
- Self-referencing dimensions show info icon with tooltip (e.g., "Permission can be inherited from parent categories")
- Kept in Phase 2 (independent of path tracing)

### HUD layout & theming
- Linear-style minimal aesthetic with distinctive branded look
- Primary accent color: mustard (warm, distinctive)
- Floating pill-shaped toolbar centered at top of canvas
- Toolbar redesigned to match HUD aesthetic — solid dark background, mustard accents, refined icons
- All new UI panels (inspect, command palette) use solid dark backgrounds (no glass transparency)
- ERD cards keep current dark glass styling unchanged
- Minimap and zoom controls restyled as HUD elements matching the dark solid aesthetic
- Canvas background: subtle dot grid pattern (like Figma/design tools)
- Breadcrumb in bottom-left corner
- Animations: smooth 300-400ms transitions with easing throughout
- Dot grid provides spatial reference on the canvas

### Editor layout
- Code editor becomes a slide-out overlay panel from the left edge
- Editor overlays on top of the canvas (no canvas resize, HUD-consistent)
- Toggled via toolbar icon + keyboard shortcut (both)
- Open by default on page load — user sees DSL and graph together initially

### Claude's Discretion
- Exact dot grid styling (opacity, spacing, color)
- Specific easing curves for animations
- Inspect panel width and internal spacing
- Command palette sizing and result density
- Minimap and controls exact positioning
- Keyboard shortcut for editor toggle (Cmd+E or similar)
- Collapse animation details
- How "hide dimmed rows" toggle is presented in the UI

</decisions>

<specifics>
## Specific Ideas

- HUD should feel like an overlay system floating on top of the canvas, not traditional app chrome
- Linear is the primary visual reference — clean, precise, lots of whitespace, single accent color
- Cards stay as-is from Phase 1 — only surrounding chrome gets the HUD treatment
- Inspect panel tree re-roots on navigation (current subgraph root = tree root) — no "you are here" highlighting needed

</specifics>

<deferred>
## Deferred Ideas

- **Path tracing + access query** — Combined feature for Phase 3. Both query-based (type a question to debug: "can user reach document#can_view?") and click-based. Shows authorization paths through the model. Includes PATH-01 (expression term highlighting) and PATH-02 (bridge indicators).
- **Dimension toggles** (CTRL-01, CTRL-02) — Killed. Subgraph exploration covers the use case.
- **Type filtering** (CTRL-03) — Killed. Subgraph exploration already filters to relevant types.
- **Permissions-only toggle** (CTRL-04) — Killed. Card sections are clear enough; subgraph + row dimming handles focus.

</deferred>

---

*Phase: 02-interaction-polish*
*Context gathered: 2026-02-22*
