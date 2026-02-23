# Phase 1: Core Pipeline - Research

**Researched:** 2026-02-22
**Domain:** React Flow ERD cards, ELK flat layout, dimension detection, colorblind-safe palettes, hover highlighting
**Confidence:** HIGH

## Summary

Phase 1 replaces the entire old visualization pipeline (compound nodes, 3-pass ELK layout, per-relation/permission nodes, per-type edge components) with a new ERD-card architecture where each FGA type is a single React Flow custom node containing rows for bindings, relations, and permissions. Edges connect between cards at row-level handles using dimension-specific colors. Layout simplifies from 3-pass hierarchical ELK to 1-pass flat ELK with orthogonal routing.

The core technical challenges are: (1) building ERD card nodes with per-row Handle components so edges attach at specific rows, (2) configuring ELK ports to match those handles for orthogonal routing, (3) detecting dimensions from existing TTU tupleset patterns in the parsed AuthorizationGraph, (4) generating a colorblind-safe categorical palette that scales dynamically, and (5) implementing hover-based path highlighting that operates at the row level without triggering re-layout.

**Primary recommendation:** Build the new pipeline in this order: dimension detection layer (pure data) -> ERD card node component -> dimension edge component -> flat ELK layout with ports -> hover highlighting -> delete old pipeline. The parser and editor layers are untouched.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Compact row density -- tight padding, maximize info per card, database schema viewer feel
- Inline symbolic expressions -- operators as symbols, dimension refs annotated inline (e.g., `admin | director | ↗membership`). Code-like, compact
- Background shade bands to separate sections (bindings, relations, permissions) -- each section gets a slightly different shade of the dark glass background, no explicit dividers
- Uniform dots for row icons -- all rows use simple dots. Section banding + position distinguishes row types. No distinct shapes per type inside cards
- Subtle edges, cards dominate -- thin edges (~1-1.5px), lower opacity. Cards are the primary visual element
- Arrowheads at target end, no labels -- directional arrows show flow, no text on edges
- All edges solid -- no dashed/dotted patterns. Type restrictions vs dimension edges distinguished by color alone (muted slate vs dimension colors)
- Dimension colors scale dynamically -- generate colors programmatically for any dimension count. Every dimension gets its own color (colorblind-safe, dark-theme compatible)
- Opacity dim for non-relevant elements -- drop to ~20-30% opacity during hover. Highlighted paths stay full opacity
- No extra effects on highlighted edges -- just full opacity while others dim. No glow, no thickening
- Subtle background tint on participating rows -- rows that are part of the hover path get a faint highlight background within their card
- Fast fade transition (~100-150ms) -- quick but smooth, takes the edge off without feeling laggy
- Moderate breathing room -- enough space between cards to clearly see edge routing, but not wasteful. Professional tool feel
- Content-adaptive card width -- cards size to fit their longest row within min/max bounds. Better space efficiency, less uniform grid
- No minimum card height -- a type with one binding renders as a tiny card. True to content, honest complexity representation
- Readable zoom as default -- start at a zoom level where card text is readable, even if that means scrolling. Prioritize immediate readability over big-picture overview

### Claude's Discretion
- Exact pixel values for padding, margins, font sizes
- ELK spacing parameters (nodeSpacing, layerSpacing)
- Arrowhead size and shape
- Min/max bounds for content-adaptive card width
- Transition easing curves
- Exact opacity values for dimming (within ~20-30% range)
- Row highlight tint color and intensity

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-01 | Dimensions auto-detected from TTU tupleset patterns | Dimension detection algorithm: group TTU edges by `tuplesetRelation` field on `AuthorizationEdge`. Each unique tupleset relation name becomes a dimension. Parser already stores `tuplesetRelation` on TTU edges and `isTuplesetBinding`/`referencedType` on binding nodes. |
| DATA-02 | All edges classified as type-restriction or dimension | Edge classification: edges with `rewriteRule === 'direct'` are type-restrictions; edges with `rewriteRule === 'ttu'` are dimension edges. Computed and tupleset-dep edges become expression text (DATA-03), not rendered edges. |
| DATA-03 | Same-card dependencies rendered as expression text, not edges | Parser already generates `definition` strings on `AuthorizationNode` (e.g., `"admin or director or manager"`). Computed and tupleset-dep edges (same-type references) become inline text in card rows. These edge types are excluded from the visual edge set. |
| DATA-04 | Schema cards built from authorization graph with correct binding/relation/permission classification | Group `AuthorizationNode[]` by `type` field. Within each type: bindings = nodes with `isTuplesetBinding === true`, permissions = nodes with `isPermission === true`, relations = remaining non-type nodes. Type nodes themselves become the card container. |
| VIZ-01 | Types render as ERD schema cards with binding/relation/permission sections | React Flow custom node with Handle per row. Three section bands with different background shades. Database schema node pattern from React Flow docs. |
| VIZ-02 | Binding rows show dimension-colored dot indicator | Each binding node has `referencedType` identifying the dimension. Map dimension name to palette color. Render colored dot before binding name. |
| VIZ-03 | Permission rows display readable expressions with `↗dimension` notation | Transform `definition` strings: replace `X from Y` patterns with `↗Y` dimension annotation. Use `referencedType` from tupleset bindings to map Y to dimension names. |
| VIZ-04 | Cross-card edges use dimension-specific colors | Palette generation: Paul Tol's Muted qualitative palette (9 colors, colorblind-safe). For >9 dimensions, extend with programmatic OKLCH generation. |
| VIZ-05 | Type restriction edges use muted slate styling | Static color from theme: `slate-500` at low opacity (~0.4). Distinct from dimension colors by being achromatic. |
| VIZ-06 | 1-pass flat ELK layout with orthogonal routing | Flat ELK graph (no `INCLUDE_CHILDREN`). Use `elk.edgeRouting: ORTHOGONAL`. Use ports with `FIXED_ORDER` constraint matching row Handle positions. |
| VIZ-07 | Layout supports TB and LR direction toggle | ELK `elk.direction: DOWN` (TB) or `RIGHT` (LR). Port sides flip accordingly (SOUTH/NORTH for TB, EAST/WEST for LR). Existing `layoutDirection` store field drives this. |
| VIZ-08 | Cards use dark glass styling | CSS: `bg-slate-900/85`, `backdrop-blur`, `rounded-xl`, type-colored accent bar at top. Section bands use incremental shade differences. |
| INT-01 | Hovering permission row highlights upstream paths | New hover model: track hovered row ID (not node ID). BFS upstream from that row's node through cross-card edges. Dim non-participating nodes/edges/rows to ~25% opacity. |
| INT-02 | Hovering card header highlights downstream paths | BFS downstream from all relations/permissions of that type through cross-card edges. Same dimming behavior as INT-01. |
| CTRL-07 | Minimap for graph overview | React Flow `<MiniMap>` component. Drop-in, already in the dependency. Style with dark theme colors. |
| CTRL-08 | Controls panel for zoom/fit | React Flow `<Controls>` component. Drop-in. Style to match dark glass theme. |
</phase_requirements>

## Standard Stack

### Core (already installed, no new dependencies needed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @xyflow/react | ^12.10.1 | Canvas, custom nodes, custom edges, MiniMap, Controls | Already installed. Provides Handle component for per-row connection points, BaseEdge for custom edge rendering, MiniMap/Controls as drop-in components |
| elkjs | ^0.11.0 | Graph layout engine | Already installed. Supports flat layered layout with orthogonal routing and port constraints. elk.bundled.js handles its own Web Worker |
| zustand | ^5.0.11 | State management | Already installed. Hover store and viewer store pattern already established |
| tailwindcss | ^4.2.0 | Styling | Already installed. Dark glass styling via Tailwind utility classes |
| react | ^19.2.0 | UI framework | Already installed |

### Supporting (no new installs)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zustand/react/shallow | (bundled) | Shallow comparison for object selectors | When selecting multiple fields from store to avoid infinite re-render |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Paul Tol palette (hardcoded) | d3-scale-chromatic | Adds dependency for something achievable with ~15 lines of constants. Not worth it. |
| ELK orthogonal routing | React Flow getSmoothStepPath fallback | SmoothStep doesn't respect port positions as precisely. ELK orthogonal is the better choice for ERD-style routing. |
| Custom minimap | React Flow MiniMap | No reason to hand-roll. Built-in component is sufficient and theme-customizable. |

**Installation:**
```bash
# No new packages needed. All dependencies already in package.json.
```

## Architecture Patterns

### Recommended Project Structure (changes from current)
```
src/
├── canvas/
│   ├── FgaGraph.tsx          # REWRITE: simplified orchestration (no compound logic)
│   ├── fgaToFlow.ts          # REWRITE: ERD card conversion with row handles
│   ├── nodes/
│   │   └── TypeCardNode.tsx  # NEW: single ERD card node (replaces TypeNode/RelationNode/PermissionNode)
│   └── edges/
│       └── DimensionEdge.tsx # NEW: single edge component (replaces Direct/Computed/TuplesetDep)
├── dimensions/
│   └── detect.ts             # NEW: dimension detection from AuthorizationGraph
├── layout/
│   ├── elk-layout.ts         # REWRITE: 1-pass flat layout with ports
│   └── elk-path.ts           # KEEP: path utilities (elkPointsToPath, trimPathToHandles)
├── theme/
│   ├── colors.ts             # UPDATE: add dimension palette, remove old edge colors
│   └── dimensions.ts         # NEW: colorblind-safe palette generator
├── store/
│   ├── viewer-store.ts       # UPDATE: add dimension state, remove compound logic
│   └── hover-store.ts        # REWRITE: row-level hover with upstream/downstream BFS
├── parser/                   # UNTOUCHED
├── editor/                   # UNTOUCHED
├── graph/                    # UPDATE: modify traversal for cross-card-only edges
├── types.ts                  # UPDATE: add Dimension types, ERD card data types
└── ...
```

### Pattern 1: ERD Card Node with Per-Row Handles
**What:** A single custom React Flow node that renders an entire FGA type as a card with rows. Each row (binding, relation, permission) gets its own `<Handle>` with a unique ID matching the `AuthorizationNode.id` for that relation.
**When to use:** Always -- this is the sole node type in the new architecture.
**Example:**
```typescript
// Source: React Flow docs - Database Schema Node pattern
// https://reactflow.dev/ui/components/database-schema-node

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

interface CardRow {
  id: string;           // e.g., "client#admin" — matches AuthorizationNode.id
  name: string;         // e.g., "admin"
  section: 'binding' | 'relation' | 'permission';
  expression?: string;  // e.g., "admin | director | ↗membership"
  dimensionColor?: string;  // for binding dots
}

interface TypeCardData {
  typeName: string;
  accentColor: string;
  rows: CardRow[];
  [key: string]: unknown;
}

function TypeCardNodeComponent({ id, data }: NodeProps) {
  const d = data as TypeCardData;
  return (
    <div className="rounded-xl overflow-hidden" style={{
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(8px)',
      minWidth: 200,
      maxWidth: 380,
    }}>
      {/* Header with accent bar */}
      <div style={{ borderTop: `3px solid ${d.accentColor}` }}
           className="px-3 py-1.5 text-sm font-semibold">
        <Handle type="target" position={Position.Top} id={`${id}__target`} />
        {d.typeName}
        <Handle type="source" position={Position.Bottom} id={`${id}__source`} />
      </div>
      {/* Rows */}
      {d.rows.map((row) => (
        <div key={row.id} className="px-3 py-1 text-xs flex items-center gap-1.5">
          <Handle type="target" position={Position.Left} id={`${row.id}__target`} />
          <span className="dot" style={{ background: row.dimensionColor ?? '#64748b' }} />
          <span>{row.name}</span>
          {row.expression && <span className="text-slate-500 ml-auto">{row.expression}</span>}
          <Handle type="source" position={Position.Right} id={`${row.id}__source`} />
        </div>
      ))}
    </div>
  );
}

export const TypeCardNode = memo(TypeCardNodeComponent);
```

### Pattern 2: ELK Ports Mapping to React Flow Handles
**What:** When building the ELK graph, each card node includes `ports` array with IDs matching the Handle IDs. ELK uses these ports for orthogonal routing. Edge `sources`/`targets` reference port IDs.
**When to use:** In the layout pass, translating React Flow nodes to ELK nodes.
**Example:**
```typescript
// Source: React Flow elkjs-multiple-handles example
// https://reactflow.dev/examples/layout/elkjs-multiple-handles

const elkNode = {
  id: 'client',
  width: measuredWidth,
  height: measuredHeight,
  properties: {
    'org.eclipse.elk.portConstraints': 'FIXED_ORDER',
  },
  ports: [
    // Target ports on left/top (depending on TB/LR)
    { id: 'client#admin__target', properties: { side: isTB ? 'NORTH' : 'WEST' } },
    { id: 'client#member__target', properties: { side: isTB ? 'NORTH' : 'WEST' } },
    // Source ports on right/bottom
    { id: 'client#admin__source', properties: { side: isTB ? 'SOUTH' : 'EAST' } },
    { id: 'client#can_read__source', properties: { side: isTB ? 'SOUTH' : 'EAST' } },
  ],
};

// Edge references specific ports
const elkEdge = {
  id: 'e-5',
  sources: ['client#admin__source'],   // port ID, not node ID
  targets: ['ip_owner#can_update__target'], // port ID on target card
};
```

### Pattern 3: Dimension Detection Algorithm
**What:** Extract dimensions from the existing `AuthorizationGraph` by grouping TTU edges by their `tuplesetRelation` field.
**When to use:** After parsing, before conversion to React Flow elements.
**Example:**
```typescript
interface Dimension {
  name: string;           // e.g., "client", "category", "intellectual_property"
  color: string;          // assigned from palette
  bindingNodeIds: Set<string>;  // nodes with isTuplesetBinding referencing this dimension
  edgeIds: Set<string>;         // TTU edge IDs belonging to this dimension
}

function detectDimensions(graph: AuthorizationGraph): Map<string, Dimension> {
  const dimensions = new Map<string, Dimension>();

  for (const edge of graph.edges) {
    if (edge.rewriteRule !== 'ttu') continue;
    const dimName = edge.tuplesetRelation!; // e.g., "client"

    if (!dimensions.has(dimName)) {
      dimensions.set(dimName, {
        name: dimName,
        color: '', // assigned later from palette
        bindingNodeIds: new Set(),
        edgeIds: new Set(),
      });
    }
    dimensions.get(dimName)!.edgeIds.add(edge.id);
  }

  // Collect binding nodes per dimension
  for (const node of graph.nodes) {
    if (node.isTuplesetBinding && node.relation) {
      const dimName = node.relation; // the tupleset relation IS the dimension name
      if (dimensions.has(dimName)) {
        dimensions.get(dimName)!.bindingNodeIds.add(node.id);
      }
    }
  }

  return dimensions;
}
```

### Pattern 4: Colorblind-Safe Dimension Palette
**What:** Use Paul Tol's Muted qualitative palette (9 colors, verified colorblind-safe) as the base. Assign colors by sorting dimension names alphabetically for stable assignment. For >9 dimensions, extend with OKLCH generation.
**When to use:** When assigning colors to detected dimensions.
**Example:**
```typescript
// Source: Paul Tol's Color Schemes (https://personal.sron.nl/~pault/)
// Muted palette — 9 colors, colorblind-safe, works on dark backgrounds

const DIMENSION_PALETTE = [
  '#CC6677', // rose
  '#332288', // indigo
  '#DDCC77', // sand
  '#117733', // green
  '#88CCEE', // cyan
  '#882255', // wine
  '#44AA99', // teal
  '#999933', // olive
  '#AA4499', // purple
] as const;

const TYPE_RESTRICTION_COLOR = '#475569'; // slate-600, muted

function assignDimensionColors(
  dimensionNames: string[],
): Map<string, string> {
  const sorted = [...dimensionNames].sort();
  const colors = new Map<string, string>();

  for (let i = 0; i < sorted.length; i++) {
    if (i < DIMENSION_PALETTE.length) {
      colors.set(sorted[i], DIMENSION_PALETTE[i]);
    } else {
      // Fallback: generate via OKLCH with high chroma, distributed hue
      const hue = (i * 137.5) % 360; // golden angle for max separation
      colors.set(sorted[i], `oklch(0.7 0.15 ${hue})`);
    }
  }

  return colors;
}
```

### Anti-Patterns to Avoid
- **Returning new objects from Zustand selectors:** Causes infinite re-renders (documented in project MEMORY.md). Use `useShallow()` or select primitives.
- **Wrapping elk.bundled.js in a custom Web Worker:** Breaks Vite bundling of the nested Worker constructor (documented in CLAUDE.md). Import directly on main thread.
- **Multiple React Flow node types for different row types:** The old architecture had TypeNode, RelationNode, PermissionNode as separate node types. The new architecture uses ONE node type (TypeCardNode) that contains all rows. This is fundamental to the ERD-card approach.
- **Rendering computed/tupleset-dep edges:** These are same-card dependencies. They must be rendered as expression text within the card, not as edges. The old pipeline filtered TTU edges but rendered computed and tupleset-dep. The new pipeline renders ONLY `direct` (type-restriction) and `ttu` (dimension) edges -- and both go through the same DimensionEdge component.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Minimap | Custom canvas overview | `<MiniMap>` from @xyflow/react | Drop-in, styled via props, maintained by xyflow team |
| Controls (zoom/fit) | Custom zoom buttons | `<Controls>` from @xyflow/react | Drop-in, includes zoom-in/out/fit-view/lock |
| Edge SVG path rendering | Manual SVG path math | `BaseEdge` from @xyflow/react + `elkPointsToPath` from existing elk-path.ts | BaseEdge handles invisible interaction area, edge selection |
| Graph layout | Manual node positioning | ELK layered algorithm via elkjs | Handles node ordering, layer assignment, edge crossing minimization, orthogonal routing |
| Colorblind-safe palette | HSL-based generation | Paul Tol's Muted palette (hardcoded 9 colors) | Scientifically validated for all common color vision deficiencies |
| Expression parsing for display | Regex on definition strings | Parser's existing `expressionFromUserset()` output + simple string transforms | The definition string is already structured (operators: `or`, `and`, `but not`, `from`). Transform `X from Y` to `↗Y` notation. |

**Key insight:** The existing parser already produces all the data needed for dimension detection (`tuplesetRelation` on edges, `isTuplesetBinding`/`referencedType` on nodes, `definition` strings). No new parsing logic is needed -- just a new grouping/classification layer on top of `AuthorizationGraph`.

## Common Pitfalls

### Pitfall 1: Handle ID Collisions Between Cards
**What goes wrong:** If two different type cards have a relation with the same name (e.g., both `ip_owner` and `client_setting` have a `client` binding), the Handle IDs must be globally unique across all nodes.
**Why it happens:** React Flow Handle IDs are scoped to their parent node, but ELK port IDs are global. If you use just `client` as the handle ID, ELK edges will route to the wrong port.
**How to avoid:** Always use the full `AuthorizationNode.id` as the handle/port ID (e.g., `ip_owner#client`, `client_setting#client`). Add `__source`/`__target` suffix for directional handles.
**Warning signs:** Edges connecting to wrong rows, edge routing going to wrong side of card.

### Pitfall 2: ELK Port Order vs Visual Row Order
**What goes wrong:** ELK with `FIXED_ORDER` port constraint respects the ORDER you list ports, not their physical Y position. If ports are listed in the wrong order, edges will cross unnecessarily.
**Why it happens:** Ports must be listed in top-to-bottom order (for TB layout) matching the visual row order in the card.
**How to avoid:** When building ELK ports array, iterate rows in the same order they appear in the card: bindings first, then relations, then permissions. Target ports listed before source ports for the same row.
**Warning signs:** Excessive edge crossings despite orthogonal routing.

### Pitfall 3: Card Measurement Before Layout
**What goes wrong:** ELK needs accurate node widths and heights BEFORE running layout. If cards are not measured first, ELK uses default sizes and the layout will be wrong.
**Why it happens:** React Flow measures nodes after initial render via `useNodesInitialized`. The current pipeline already handles this (layout runs only after nodes are initialized). The new pipeline must preserve this sequencing.
**How to avoid:** Keep the existing pattern: render cards with position {0,0}, wait for `useNodesInitialized`, then run ELK layout with measured dimensions. The `layoutDone.current` ref pattern from the current FgaGraph.tsx is correct.
**Warning signs:** Cards overlapping after layout, ELK using default 120x40 sizes.

### Pitfall 4: Content-Adaptive Width vs ELK Expectations
**What goes wrong:** If cards use CSS `width: fit-content` or similar, the measured width varies per card. ELK handles variable node sizes correctly, but you must pass the actual measured width to ELK, not a hardcoded default.
**Why it happens:** The user decision specifies content-adaptive card width with min/max bounds.
**How to avoid:** Set `minWidth` and `maxWidth` on the card component via CSS, let the browser determine actual width, then read `node.measured.width` from React Flow before passing to ELK.
**Warning signs:** Cards being too narrow (text overflow) or too wide (wasted space).

### Pitfall 5: Hover State Performance with Row-Level Granularity
**What goes wrong:** If hover state includes row-level information (which row is hovered), every mouse movement between rows triggers a state update and re-render of all connected components.
**Why it happens:** Moving from one row to another within the same card fires mouseEnter/mouseLeave events rapidly.
**How to avoid:** Keep the hover store as a micro-store (current pattern). Use `React.memo` on the card component. The hover store should expose `hoveredRowId: string | null` and pre-computed highlight sets, so individual row components only re-render when their highlight status changes. Consider debouncing row-level hover or batching with `unstable_batchedUpdates`.
**Warning signs:** Janky/laggy hover response, excessive re-renders visible in React DevTools.

### Pitfall 6: Edge Direction Confusion (Source = Dependency)
**What goes wrong:** The parser uses source = dependency, target = dependent (source -> target means "source feeds into target"). This is the opposite of what some people expect. Getting this wrong inverts all edges.
**Why it happens:** The convention in the existing codebase is documented in types.ts: "source (dependency) -> target (dependent relation)". Arrowheads point at the target.
**How to avoid:** When building ELK edges, maintain the same convention: `sources: [sourceHandleId]`, `targets: [targetHandleId]`. The arrowhead marker goes on the target end (already the default in React Flow).
**Warning signs:** Arrows pointing the wrong way, edges going from permissions to types instead of types to permissions.

## Code Examples

### Example 1: Dimension Detection from Sample Model

Given the sample model, the dimension detection would find these dimensions:
- `client` dimension: used by `user`, `ip_owner`, `client_setting`, `jurisdiction`, `ip_agency`, `category`, `intellectual_property`, `task`, `file` (most types have `define client: [client]` as a tupleset binding)
- `parent` dimension: used by `category` (`define parent: [category]`)
- `category` dimension: used by `intellectual_property` (`define category: [category]`)
- `intellectual_property` dimension: used by `task` (`define intellectual_property: [intellectual_property]`)
- `ip_agency` dimension: used by `client_setting`, `jurisdiction`, `intellectual_property`, `task`

```typescript
// After parsing the sample model:
// TTU edges have tuplesetRelation set to the binding name
// e.g., "can_read from client" creates a TTU edge with tuplesetRelation="client"

// Dimension "client" edges:
// e.g., client#can_read -> user#can_read (via "can_read from client")
// e.g., client#admin -> ip_owner#can_update (via "admin from client")

// These all use tupleset relation "client", so they group into dimension "client"
```

### Example 2: Expression Transformation for Display

```typescript
// Parser output: "admin or director or manager or member"
// Display: "admin | director | manager | member"
//
// Parser output: "can_read from client or member from ip_agency"
// Display: "↗client.can_read | ↗ip_agency.member"
//
// Parser output: "[user] or can_manage from category or admin from client"
// Display: "[user] | ↗category.can_manage | ↗client.admin"

function transformExpression(definition: string): string {
  // Split on operators: " or ", " and ", " but not "
  // For each term:
  //   - "X from Y" becomes "↗Y.X" (dimension reference)
  //   - "[type]" stays as-is (direct type restriction)
  //   - plain name stays as-is (computed reference)
  // Join with symbolic operators: | for or, & for and, \ for but not
}
```

### Example 3: Flat ELK Layout Configuration

```typescript
// Source: ELK reference https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-layered.html

const elkGraph = {
  id: 'root',
  layoutOptions: {
    'elk.algorithm': 'layered',
    'elk.direction': direction === 'TB' ? 'DOWN' : 'RIGHT',
    'elk.edgeRouting': 'ORTHOGONAL',
    'elk.spacing.nodeNode': '40',               // between cards
    'elk.layered.spacing.nodeNodeBetweenLayers': '60', // between layers
    'elk.spacing.portPort': '4',                // between ports on same side
    'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
    'elk.layered.nodePlacement.favorStraightEdges': 'true',
    // NO hierarchyHandling — flat graph, no compounds
  },
  children: cards.map(card => ({
    id: card.id,
    width: card.measuredWidth,
    height: card.measuredHeight,
    properties: {
      'org.eclipse.elk.portConstraints': 'FIXED_ORDER',
    },
    ports: card.ports, // built from Handle IDs
  })),
  edges: crossCardEdges.map(edge => ({
    id: edge.id,
    sources: [edge.sourceHandle],
    targets: [edge.targetHandle],
  })),
};
```

### Example 4: Hover Highlighting (Upstream BFS)

```typescript
// When a permission row is hovered, trace upstream:
// 1. Find all cross-card edges where target matches the hovered row's node ID
// 2. BFS backward through those edges
// 3. Collect all participating node IDs and edge IDs
// 4. For each participating node, identify which rows are part of the path

function traceUpstream(
  hoveredRowId: string,
  edges: AuthorizationEdge[],
): { nodeIds: Set<string>; edgeIds: Set<string>; rowIds: Set<string> } {
  const crossCardEdges = edges.filter(e =>
    e.rewriteRule === 'direct' || e.rewriteRule === 'ttu'
  );

  const visited = new Set<string>([hoveredRowId]);
  const visitedEdges = new Set<string>();
  const queue = [hoveredRowId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of crossCardEdges) {
      if (edge.target === current && !visited.has(edge.source)) {
        visited.add(edge.source);
        visitedEdges.add(edge.id);
        queue.push(edge.source);
      }
    }
  }

  return { nodeIds: visited, edgeIds: visitedEdges, rowIds: visited };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 3-pass compound ELK layout | 1-pass flat ELK layout | This phase | Eliminates grid redistribution, root repack, route invalidation. Much simpler. |
| Separate nodes for each relation/permission | Single ERD card per type | This phase | One React Flow node per type instead of ~5-20 nodes per type. Drastically reduces node count. |
| Three edge components (Direct/Computed/TuplesetDep) | Single DimensionEdge component | This phase | Edges distinguished by color only (dimension color vs muted slate). |
| TTU edges hidden, computed/tupleset-dep rendered | Only cross-card edges rendered (direct + TTU) | This phase | Same-card edges become expression text. TTU edges now VISIBLE as dimension edges. |
| Type-based coloring (each type gets a color) | Dimension-based coloring (each structural binding gets a color) | This phase | Colors communicate structural meaning, not arbitrary type identity. |
| Node-level hover (hover a node, dim others) | Row-level hover (hover a row, trace upstream/downstream) | This phase | More precise exploration of permission dependencies. |

**Deprecated/outdated:**
- `TypeNode`, `RelationNode`, `PermissionNode` components: replaced by single `TypeCardNode`
- `DirectEdge`, `ComputedEdge`, `TuplesetDepEdge` components: replaced by single `DimensionEdge`
- `fgaToFlow.ts` conversion with compound parent-child logic: replaced with flat card conversion
- `elk-layout.ts` 3-pass pipeline: replaced with 1-pass flat layout
- `useNodeInteraction` / `useEdgeInteraction` hooks: replaced with row-aware hover hooks
- `TYPE_PALETTE` and `EXTRA_COLORS` in theme: replaced with dimension palette

## Open Questions

1. **How should card width measurement work with content-adaptive sizing?**
   - What we know: React Flow measures nodes after initial render. Cards need `minWidth`/`maxWidth` CSS constraints. ELK needs the actual measured width.
   - What's unclear: Should we pre-calculate width based on text content (to avoid a render-measure-layout cycle), or rely on the existing render-then-measure pattern?
   - Recommendation: Use the existing pattern (render at 0,0 -> measure -> layout). React Flow's `useNodesInitialized` already handles this. The extra render cycle is invisible because the graph fades in after layout (current `opacity: layoutReady ? 1 : 0` pattern).

2. **How many ports per card row: one or two (source + target)?**
   - What we know: In TB layout, target handles go on left, source handles on right (or top/bottom). ELK port `side` property controls this.
   - What's unclear: Do ALL rows need both source and target handles, or only rows that actually participate in cross-card edges?
   - Recommendation: Start with handles on all rows (simpler, more future-proof). Use CSS to hide them visually (`opacity: 0`). ELK will position ports correctly even if some are unused. Optimization later if needed.

3. **Should the dimension detection run in the parser or as a separate layer?**
   - What we know: The parser already computes `isTuplesetBinding`, `referencedType`, and `tuplesetRelation`. Dimension detection groups this data.
   - What's unclear: Whether to extend `buildAuthorizationGraph()` or create a separate `detectDimensions()` function.
   - Recommendation: Separate layer (`src/dimensions/detect.ts`). Keeps the parser focused on FGA semantics and the dimension layer focused on visualization semantics. The parser's job is to produce a faithful graph; the dimension layer's job is to classify edges for visualization.

4. **Expression display: transform the parser's definition string or rebuild from the AST?**
   - What we know: Parser already generates `definition` strings like `"admin or director or manager or member"` and `"can_read from client or member from ip_agency"`.
   - What's unclear: Whether string transformation (regex on `X from Y`) is robust enough, or if we need AST-level access.
   - Recommendation: String transformation is sufficient. The `definition` field uses a consistent format generated by `expressionFromUserset()`. The patterns are regular: `or`/`and`/`but not` as operators, `X from Y` for TTU references, `[type]` or `[type#rel]` for direct restrictions. A simple split-and-transform function will work.

## Sources

### Primary (HIGH confidence)
- React Flow docs (reactflow.dev) - Custom nodes with multiple handles, database schema node pattern, MiniMap, Controls API
- React Flow elkjs-multiple-handles example (reactflow.dev/examples/layout/elkjs-multiple-handles) - Port mapping pattern
- ELK reference (eclipse.dev/elk/reference/) - Port constraints (FIXED_ORDER, FIXED_POS), edge routing (ORTHOGONAL), layered algorithm options
- elkjs GitHub (github.com/kieler/elkjs) - API usage, layout options, bundled worker pattern
- Existing codebase analysis - Parser output structure, store patterns, layout orchestration

### Secondary (MEDIUM confidence)
- Paul Tol's Color Schemes (personal.sron.nl/~pault/) - Muted qualitative palette hex codes verified via Observable notebook (observablehq.com/@jotasolano/paul-tol-schemes)
- ELK layered algorithm reference (eclipse.dev/elk/reference/algorithms/org-eclipse-elk-layered.html) - Spacing options, node placement strategies

### Tertiary (LOW confidence)
- OKLCH fallback palette for >9 dimensions - Based on general color science knowledge. The golden angle hue distribution is well-established but the specific OKLCH lightness/chroma values for dark themes may need tuning during implementation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed, no new dependencies needed
- Architecture: HIGH - ERD card pattern verified in React Flow docs, ELK port/routing options verified in official reference
- Dimension detection: HIGH - Algorithm derived directly from existing parser output fields (tuplesetRelation, isTuplesetBinding, referencedType)
- Palette: HIGH for base (Paul Tol Muted, 9 colors), MEDIUM for extension (OKLCH generation for >9)
- Pitfalls: HIGH - Derived from codebase analysis and React Flow/ELK documentation
- Hover highlighting: MEDIUM - Row-level hover is a new pattern not in the current codebase. The BFS algorithm is straightforward but performance with many rows is unverified.

**Research date:** 2026-02-22
**Valid until:** 2026-03-22 (stable stack, no fast-moving dependencies)
