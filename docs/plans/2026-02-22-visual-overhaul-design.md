# Visual Overhaul Design

## Problem

The current graph visualization uses compound nodes (types as containers for relation/permission child nodes) with a 3-pass ELK layout system. This produces tangled edges, broken cross-compound routing, and an unreadable graph at scale. The official OpenFGA tool uses force-directed circles — equally unreadable.

The authorization graph is not a hierarchy. Relations cross-link freely across types. Imposing tree structure (containment) on a DAG creates fundamental tension between grouping and routing.

## Design Decisions

### 1. ERD Schema Cards (replaces compound nodes)

Each type renders as a single React Flow node — an ERD-style card with two sections:

**Top section — Ownership:** Structural binding rows showing what this resource belongs to. Each binding row displays the tupleset relation name, its type restriction, and a colored dimension indicator.

**Bottom section — Permissions:** Permission and relation rows showing how access is granted. Each row displays the relation name and a readable expression. Expressions use `↗dimension` notation to indicate cross-type access channels (e.g., `admin ↗client` means "admin via the client dimension").

Card visual treatment:
- Dark glass background (`rgba(15,23,42,0.85)`)
- Type-colored left accent bar on header
- Rounded corners (`rounded-xl`), generous padding
- Monospace for relation names, muted for expressions
- Relation rows: circle icon. Permission rows: diamond icon. Binding rows: dimension-colored dot.

This eliminates compound nodes entirely. Internal card layout is HTML/CSS, not ELK child positioning. Graph node count drops from (types + relations + permissions) to just (types).

### 2. Dimension Model (replaces edge type classification)

A **dimension** is a set of cross-type access channels sharing the same tupleset relation. Detected automatically from the authorization model:

```
For every TTU expression "X from Y":
  Y is a tupleset relation (structural binding)
  All TTU edges sharing the same Y form a dimension
```

Sample model dimensions:

| Dimension | Tupleset | Cards connected | Description |
|-----------|----------|----------------|-------------|
| client | `client: [client]` | 8 types | Tenancy — resource belongs to tenant |
| ip_agency | `ip_agency: [ip_agency]` | 4 types | Agency — third-party access |
| intellectual_property | `intellectual_property: [IP]` | 2 types | Resource ownership |
| category | `category: [category]` | 1 type | Classification |
| parent | `parent: [category]` | 1 type (self-ref) | Hierarchy |

Formal basis: the OpenFGA spec defines TTU as tupleset (structural binding) + computed userset (access check). The tupleset is always a structural foreign key. Dimensions group edges by their structural binding.

### 3. Edge System

Every cross-card edge falls into exactly one category:

| Category | What | Example | Visual |
|----------|------|---------|--------|
| Type restriction (direct) | Who can fill this role | `user` → `client#admin` | Solid, muted slate |
| Dimension edge (TTU) | Access through structural binding | `client#can_read` → `IP#can_read` | Solid, dimension color |

Same-card dependencies (computed userset, tupleset-dep) are NOT rendered as edges. They are visible in the permission row's expression text and highlighted during path tracing.

Each dimension gets a distinct color hue (6 categories total, within the 7-10 max for distinguishable categorical colors).

Edge routing uses binding rows as dimension ports — all TTU edges arriving at a card through the same dimension converge at the binding row's port, creating natural edge bundling.

**Dimension controls:** Toolbar chips, one per detected dimension. Toggle on/off to show/hide that dimension's edges. Solo mode (modifier+click) shows only one dimension.

### 4. Subgraph Exploration

Single-click exploration that restructures the graph — removes non-relevant cards and re-lays out.

| Action | Direction | Effect |
|--------|-----------|--------|
| Hover permission row | Upstream | Highlight feeding paths, dim rest. Layout stable. |
| Hover card header | Downstream | Highlight enabled paths, dim rest. Layout stable. |
| Click permission row | Upstream | Subgraph: only cards/edges feeding this permission. Re-layout. |
| Click card header | Downstream | Subgraph: only cards/edges this type enables. Re-layout. |

Hover is preview (highlight), click is commit (restructure). Same directional semantics, different intensity.

**Upstream subgraph** (click permission): Walk backward through all edges feeding into the permission. Collect only contributing cards and rows. Re-layout with ELK on the reduced graph.

**Downstream subgraph** (click card): Walk forward through all edges from this type's rows. Collect all cards receiving permissions through this type.

Within a subgraph, dimension toggles still work. Esc or back button returns to full graph.

### 5. Path Tracing

Path tracing operates within subgraphs. When viewing an upstream subgraph for a permission, all paths are visible simultaneously with dimension colors showing which access channels each path uses.

**Cross-card path steps:** Shown as highlighted dimension-colored edges between cards.

**Same-card path steps:** Shown as highlighted rows within a card. The specific contributing term in the expression is highlighted in accent color (e.g., `admin | director | manager | MEMBER` with "member" highlighted).

**Binding bridge indicators:** Binding rows that enable TTU hops get a subtle bridge highlight showing they are the conduit for cross-type access.

**Recursive hierarchy handling:** Self-referencing patterns like `category#parent` are NOT expanded (depth is a runtime concern, unknown at model level). The parent binding row shows an info icon with tooltip: "Permission can be inherited from parent categories." Both the permission row and parent binding row are highlighted.

### 6. Layout

One-pass flat ELK layout replacing the 3-pass compound system.

| Setting | Value | Rationale |
|---------|-------|-----------|
| Algorithm | `layered` | DAG — access flows in one direction |
| Edge routing | `ORTHOGONAL` | Clean right-angle edges |
| Direction | `DOWN` or `RIGHT` (toggle) | User preference TB/LR |
| Port constraints | `FIXED_ORDER` | Ports ordered by row position |
| Node spacing | ~60-80px | Cards are tall, need room |
| Edge spacing | ~20px | Prevent overlap at hubs |

Card dimensions measured after initial hidden render, passed to ELK, positions applied. Subgraph exploration triggers re-layout on the reduced card set.

## Features

### Kept

- **Layout direction toggle (TB/LR)** — one ELK param, simpler with flat layout
- **Type filtering UI** — show/hide specific type cards
- **Minimap** — React Flow one-liner
- **Controls panel** — React Flow one-liner
- **Command palette search (Cmd+K)** — fuzzy search for types/relations/permissions, navigate to card/row
- **Permissions-only toggle** — collapses relation section on all cards, showing only permissions

### Killed

- **Cross-compound edge distinction** — no compounds, all edges are cross-card
- **Focus mode (k-hop neighborhood)** — replaced by directional subgraph exploration
- **TTU-aware hover expansion** — TTU edges are first-class dimension edges, always visible
- **Edge visual distinction by rewrite rule** — replaced by dimension coloring
- **3-pass ELK layout** — replaced by 1-pass flat layout
- **Compound expand/collapse** — no compounds

### New

- **ERD schema cards** — type cards with ownership + permissions sections
- **Auto-detected dimensions** — tupleset relations classified as dimensions
- **Dimension toggles** — per-dimension edge visibility controls
- **Subgraph exploration** — click permission (upstream) or card (downstream)
- **Row-level expression annotation** — dimension indicators + path-trace highlighting
- **Card expand/collapse** — collapse to header-only for large models

### Redesigned

- **Hover interaction** — row-level, same directional semantics as click (upstream on permissions, downstream on cards), highlight instead of restructure
- **Path tracing** — subgraph-based with dimension colors, same-card expression annotation, recursive hierarchy info indicators
- **Legend** — dimensions (colored) + row type icons instead of edge rewrite rules

## Data Flow (Updated)

```
FGA DSL (editor)
  -> parse (parser/) -> AuthorizationGraph
  -> detectDimensions() -> Dimension[] (auto-detected tupleset groupings)
  -> applyFilters + dimensionToggles -> visible graph
  -> toSchemaCards() -> React Flow nodes (one per type, with row port definitions)
  -> classifyEdges() -> type restriction edges + dimension edges
  -> ELK layout (single pass, flat, orthogonal) -> positioned cards + routed edges
  -> React Flow render (ERD card components with row-level ports)
```

## Open Questions

- Exact dimension color palette (needs to work on dark theme, be distinguishable, colorblind-safe)
- Card max-height before scroll vs collapse threshold
- Animation for subgraph enter/exit transitions
- Whether clicking a relation row (not permission, not card header) should trigger downstream subgraph or be unsupported
- Edge label placement for dimension edges (on edge vs at port)
