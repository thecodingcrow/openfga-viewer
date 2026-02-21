# Visual Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace compound node visualization with ERD schema cards, dimension-aware edges, subgraph exploration, and 1-pass flat ELK layout.

**Architecture:** Build new systems alongside old ones (new files), then swap FgaGraph to use new components, then delete old. Each phase produces a compilable state. The parser and editor are untouched — only the visualization pipeline changes.

**Tech Stack:** React 19, React Flow v12, elkjs (bundled), Zustand 5, TypeScript strict, Tailwind v4

**Verification:** `npm run build` (tsc + vite) and `npm run lint` after every task. No test suite exists — visual verification in browser at phase boundaries.

---

## Phase 1: Types & Dimension Detection

Foundation layer. New types and the dimension detection algorithm. No visual changes yet.

### Task 1.1: Extend Core Types

**Files:**
- Modify: `src/types.ts`

Add new types alongside existing ones (don't remove anything yet):

```typescript
// --- New types for ERD card approach ---

export interface Dimension {
  /** The tupleset relation name (e.g., "client", "parent", "category") */
  name: string;
  /** The type that owns the tupleset (e.g., "client" for client: [client]) */
  sourceType: string;
  /** Types that have this tupleset binding */
  connectedTypes: string[];
  /** Number of TTU edges in this dimension */
  edgeCount: number;
}

export type EdgeCategory = 'type-restriction' | 'dimension';

export interface ClassifiedEdge extends AuthorizationEdge {
  category: EdgeCategory;
  /** Dimension name if category is 'dimension', undefined otherwise */
  dimensionName?: string;
}

export interface SchemaCardRow {
  id: string;           // node ID: "client#admin"
  name: string;         // "admin"
  kind: 'binding' | 'relation' | 'permission';
  expression: string;   // readable expression: "[user] | can_manage ↗category"
  dimensionName?: string; // for binding rows: which dimension this creates
  isPermission: boolean;
}

export interface SchemaCard {
  typeId: string;         // "client"
  typeName: string;       // "client"
  bindings: SchemaCardRow[];    // ownership section (tupleset bindings)
  relations: SchemaCardRow[];   // non-binding, non-permission relations
  permissions: SchemaCardRow[]; // permission rows
}
```

**Step 1:** Add the types above to `src/types.ts`
**Step 2:** Run `npm run build && npm run lint`
**Step 3:** Commit: `feat: add types for ERD cards, dimensions, classified edges`

### Task 1.2: Dimension Detection

**Files:**
- Create: `src/graph/dimensions.ts`

Implement dimension detection — scan edges for TTU tupleset patterns, group by tupleset relation.

```typescript
import type { AuthorizationNode, AuthorizationEdge, Dimension, ClassifiedEdge } from '../types';

/**
 * Detect dimensions from the authorization graph.
 * A dimension = a set of TTU edges sharing the same tupleset relation.
 * The tupleset relation is the "Y" in "X from Y" expressions.
 */
export function detectDimensions(
  nodes: AuthorizationNode[],
  edges: AuthorizationEdge[],
): Dimension[] {
  // 1. Find all tupleset relations: edges with rewriteRule === 'tupleset-dep'
  //    The tuplesetRelation field tells us the binding name
  // 2. For each tupleset relation, find all TTU edges that use it
  //    TTU edges have tuplesetRelation matching the binding
  // 3. Group by tupleset relation name
  // 4. Build Dimension objects with connected types and edge counts
  // 5. Sort by edgeCount descending (most connected = most important)
}

/**
 * Classify all edges as either 'type-restriction' (direct) or 'dimension' (TTU).
 * Same-card edges (computed, tupleset-dep) are excluded — they become row text.
 */
export function classifyEdges(
  edges: AuthorizationEdge[],
  dimensions: Dimension[],
): ClassifiedEdge[] {
  // 1. Filter to cross-card edges only:
  //    - 'direct' edges → category: 'type-restriction'
  //    - 'ttu' edges → category: 'dimension', dimensionName from tuplesetRelation
  // 2. Exclude 'computed' and 'tupleset-dep' (same-card, rendered as text)
}
```

**Step 1:** Create `src/graph/dimensions.ts` with `detectDimensions()` and `classifyEdges()`
**Step 2:** Run `npm run build && npm run lint`
**Step 3:** Commit: `feat: dimension detection and edge classification`

### Task 1.3: Schema Card Builder

**Files:**
- Create: `src/graph/schema-cards.ts`

Convert AuthorizationGraph nodes into SchemaCard structures.

```typescript
import type { AuthorizationNode, AuthorizationEdge, Dimension, SchemaCard, SchemaCardRow } from '../types';

/**
 * Build SchemaCard data for each type in the graph.
 * Classifies each relation as binding, relation, or permission.
 * Generates readable expression strings with dimension annotations.
 */
export function buildSchemaCards(
  nodes: AuthorizationNode[],
  edges: AuthorizationEdge[],
  dimensions: Dimension[],
): SchemaCard[] {
  // 1. Group nodes by type
  // 2. For each type:
  //    a. Identify binding rows: relations that appear as tupleset in any dimension
  //    b. Identify permission rows: nodes with isPermission === true
  //    c. Remaining relations go to relations section
  //    d. Build expression string for each row:
  //       - Direct type restrictions: "[user]" or "[user, team#member]"
  //       - Computed references: "admin | director" (same-type refs)
  //       - TTU references: "can_read ↗category" (with dimension annotation)
  //       - Union: " | " separator
  //    e. Attach dimensionName to binding rows
}

/**
 * Build readable expression string for a relation/permission.
 * Annotates cross-type references with ↗dimension notation.
 */
export function buildExpression(
  node: AuthorizationNode,
  edges: AuthorizationEdge[],
  dimensions: Dimension[],
): string {
  // Walk the edges targeting this node
  // For each edge:
  //   - direct → "[sourceType]" or "[sourceType#relation]"
  //   - computed → "relationName" (plain, same card)
  //   - ttu → "relationName ↗dimensionName"
  //   - tupleset-dep → skip (implicit in TTU expression)
  // Join with " | "
}
```

**Step 1:** Create `src/graph/schema-cards.ts` with `buildSchemaCards()` and `buildExpression()`
**Step 2:** Run `npm run build && npm run lint`
**Step 3:** Commit: `feat: schema card builder with expression generation`

### Task 1.4: Subgraph Extraction

**Files:**
- Create: `src/graph/subgraph.ts`

Algorithms for upstream/downstream subgraph extraction.

```typescript
import type { AuthorizationNode, AuthorizationEdge } from '../types';

export interface SubgraphResult {
  nodeIds: Set<string>;
  edgeIds: Set<string>;
  /** Binding node IDs that act as bridges (enable TTU hops) */
  bridgeNodeIds: Set<string>;
}

/**
 * Extract upstream subgraph: all nodes/edges feeding into a target node.
 * Walks backward through direct + TTU + computed edges.
 * Also identifies binding rows that enable TTU hops (bridges).
 */
export function extractUpstream(
  targetNodeId: string,
  nodes: AuthorizationNode[],
  edges: AuthorizationEdge[],
): SubgraphResult {
  // BFS/DFS backward from targetNodeId
  // Follow edges where target === currentNode (walk sources)
  // For TTU edges: also include the tupleset binding node as a bridge
  // For computed edges: include same-type source
  // Collect all visited nodeIds + traversed edgeIds
}

/**
 * Extract downstream subgraph: all nodes/edges enabled by a source type.
 * Walks forward through direct + TTU edges from any row on the source type.
 */
export function extractDownstream(
  sourceType: string,
  nodes: AuthorizationNode[],
  edges: AuthorizationEdge[],
): SubgraphResult {
  // 1. Find all nodes belonging to sourceType
  // 2. BFS/DFS forward from each: follow edges where source === currentNode
  // 3. For TTU edges: follow to target, also mark binding as bridge
  // 4. For computed: follow same-type targets
  // 5. Collect all visited nodeIds + traversed edgeIds
}
```

**Step 1:** Create `src/graph/subgraph.ts` with `extractUpstream()` and `extractDownstream()`
**Step 2:** Run `npm run build && npm run lint`
**Step 3:** Commit: `feat: subgraph extraction for upstream/downstream exploration`

---

## Phase 2: Dimension Colors & Theme

### Task 2.1: Dimension Color Palette

**Files:**
- Modify: `src/theme/colors.ts`

Add dimension color definitions. Must work on dark theme, be distinguishable, and colorblind-safe.

```typescript
// Add to colors.ts:

/** Dimension colors — categorical palette for cross-type access channels */
export const DIMENSION_COLORS: Record<string, string> = {};

/** Assign a color to a dimension by name. Uses predefined mapping or hash fallback. */
export function getDimensionColor(dimensionName: string): string {
  // Return from DIMENSION_COLORS if known, else hash to EXTRA_DIMENSION_COLORS
}
```

Use a colorblind-safe categorical palette (6 hues max). Suggested starting point:
- Muted slate for type-restriction edges
- Blue for most common dimension (often tenant)
- Amber for secondary dimensions
- Purple, green, teal for remaining

**Step 1:** Add dimension color palette and `getDimensionColor()` to `src/theme/colors.ts`
**Step 2:** Run `npm run build && npm run lint`
**Step 3:** Commit: `feat: dimension color palette`

---

## Phase 3: ERD Schema Card Component

New node rendering. Build alongside old components (don't delete yet).

### Task 3.1: SchemaCard Node Component

**Files:**
- Create: `src/canvas/nodes/SchemaCard.tsx`

Single React Flow custom node that renders the entire ERD card. This replaces TypeNode, RelationNode, and PermissionNode.

The component receives the full `SchemaCard` data via React Flow node data. It renders:
- Header with type name + colored accent bar
- Binding section (ownership rows with dimension-colored dots)
- Divider
- Relations section (non-permission, non-binding rows)
- Permissions section (permission rows with expression text)
- Row-level React Flow Handles (ports) for edge connections

Key implementation details:
- `React.memo` wrapped
- Each row renders a Handle with `id={rowNodeId}` for row-level port routing
- Card header renders a Handle with `id={typeId}` for type-level direct edges
- Binding rows show dimension-colored dot indicator
- Permission expressions use `↗` notation with dimension color tinting
- Rows support dimmed/highlighted/active states via CSS classes
- Dark glass styling: `bg-slate-900/85 backdrop-blur-sm rounded-xl border border-slate-700/50`

```typescript
// Component structure:
// SchemaCard (React.memo)
//   ├─ CardHeader (type name, accent bar, header Handle)
//   ├─ BindingSection (binding rows, each with Handle + dimension dot)
//   ├─ Divider
//   ├─ RelationSection (relation rows, each with Handle)
//   └─ PermissionSection (permission rows, each with Handle)
//
// Each row renders:
//   <Handle type="target" position={Position.Left} id={`${rowId}-in`} />
//   <RowContent icon={kind} name={name} expression={expr} />
//   <Handle type="source" position={Position.Right} id={`${rowId}-out`} />
```

**Step 1:** Create `src/canvas/nodes/SchemaCard.tsx` with full card rendering
**Step 2:** Run `npm run build && npm run lint`
**Step 3:** Commit: `feat: SchemaCard ERD node component`

### Task 3.2: Row Interaction Hook

**Files:**
- Create: `src/canvas/nodes/useRowInteraction.ts`

Replace `useNodeInteraction.ts` with row-level awareness. Computes which rows are dimmed/highlighted/active based on hover state, subgraph state, and path trace state.

```typescript
export interface RowInteractionState {
  dimmed: boolean;
  highlighted: boolean;
  /** The specific term to highlight in the expression during path trace */
  activeExpressionTerm?: string;
  /** Whether this binding row is a bridge in the current trace */
  isBridge: boolean;
}

export function useRowInteraction(rowNodeId: string): RowInteractionState {
  // Check hover store: is this row in the focal set?
  // Check viewer store: is this row in the traced path?
  // Check subgraph store: is this row in the active subgraph?
  // Compute dimmed/highlighted/active/bridge states
}
```

**Step 1:** Create `src/canvas/nodes/useRowInteraction.ts`
**Step 2:** Run `npm run build && npm run lint`
**Step 3:** Commit: `feat: row-level interaction hook`

---

## Phase 4: Edge Consolidation

### Task 4.1: Unified DimensionEdge Component

**Files:**
- Create: `src/canvas/edges/DimensionEdge.tsx`

Single edge component replacing DirectEdge, ComputedEdge, TuplesetDepEdge. Edge visual style determined by `ClassifiedEdge` data (category + dimensionName).

```typescript
// Edge data carries classification:
interface DimensionEdgeData {
  category: EdgeCategory;      // 'type-restriction' | 'dimension'
  dimensionName?: string;      // e.g., "client"
  dimensionColor?: string;     // resolved color
  elkRoute?: ElkRoute;         // layout-computed route
}

// Visual mapping:
// type-restriction → solid, muted slate, 1.5px
// dimension → solid, dimensionColor, 1.5px
// All edges: orthogonal routing from ELK, fallback to getSmoothStepPath
```

**Step 1:** Create `src/canvas/edges/DimensionEdge.tsx`
**Step 2:** Run `npm run build && npm run lint`
**Step 3:** Commit: `feat: unified DimensionEdge component with dimension coloring`

### Task 4.2: Edge Interaction Hook Update

**Files:**
- Create: `src/canvas/edges/useDimensionEdgeInteraction.ts`

New hook for dimension-aware edge styling. Handles:
- Dimension color lookup
- Path trace highlighting (glow when on traced path)
- Hover dimming (dim when not connected to hovered row)
- Subgraph dimming

**Step 1:** Create the hook
**Step 2:** Run `npm run build && npm run lint`
**Step 3:** Commit: `feat: dimension-aware edge interaction hook`

---

## Phase 5: Flow Conversion Rewrite

### Task 5.1: New toSchemaFlow Conversion

**Files:**
- Create: `src/canvas/schemaToFlow.ts`

New conversion layer replacing `fgaToFlow.ts`. Converts SchemaCards + ClassifiedEdges → React Flow nodes + edges with port definitions.

```typescript
import type { Node, Edge } from '@xyflow/react';
import type { SchemaCard, ClassifiedEdge, Dimension } from '../types';

export interface SchemaCardNodeData {
  card: SchemaCard;
  dimensions: Dimension[];
}

export interface DimensionEdgeData {
  category: EdgeCategory;
  dimensionName?: string;
  dimensionColor?: string;
}

/**
 * Convert schema cards and classified edges to React Flow elements.
 * Each SchemaCard becomes one React Flow node.
 * Each ClassifiedEdge becomes one React Flow edge with source/target handle IDs.
 */
export function toSchemaFlow(
  cards: SchemaCard[],
  classifiedEdges: ClassifiedEdge[],
  dimensions: Dimension[],
): { nodes: Node<SchemaCardNodeData>[]; edges: Edge<DimensionEdgeData>[] } {
  // 1. One Node per SchemaCard:
  //    - id: card.typeId
  //    - type: 'schemaCard'
  //    - data: { card, dimensions }
  //
  // 2. One Edge per ClassifiedEdge:
  //    - For 'type-restriction': source=sourceType card, sourceHandle=typeId (header port)
  //                              target=targetType card, targetHandle=targetRowId-in
  //    - For 'dimension': source=sourceType card, sourceHandle=sourceRowId-out
  //                       target=targetType card, targetHandle=bindingRowId-in
  //      (dimension edges arrive at the binding row port, not the permission row)
  //    - data: { category, dimensionName, dimensionColor }
}
```

**Step 1:** Create `src/canvas/schemaToFlow.ts`
**Step 2:** Run `npm run build && npm run lint`
**Step 3:** Commit: `feat: schema-to-flow conversion with row-level ports`

---

## Phase 6: Layout Simplification

### Task 6.1: Flat ELK Layout

**Files:**
- Create: `src/layout/schema-layout.ts`

New 1-pass flat ELK layout replacing the 3-pass compound system. Much simpler.

```typescript
import type { Node, Edge } from '@xyflow/react';
import type { LayoutDirection } from '../types';

/**
 * Layout schema cards using flat ELK with orthogonal edge routing.
 * Single pass — no compound nodes, no grid redistribution, no root repack.
 */
export async function layoutSchemaCards(
  nodes: Node[],
  edges: Edge[],
  direction: LayoutDirection,
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  // 1. Build flat ELK graph:
  //    - Each node = one card (id, width, height from measured dimensions)
  //    - Each node has ports array (from card rows + header)
  //    - Port constraints: FIXED_ORDER, ports ordered by row position
  //    - Edges reference source/target ports by handle ID
  //
  // 2. ELK options:
  //    algorithm: 'layered'
  //    'elk.direction': direction === 'TB' ? 'DOWN' : 'RIGHT'
  //    'elk.edgeRouting': 'ORTHOGONAL'
  //    'elk.layered.spacing.nodeNodeBetweenLayers': '80'
  //    'elk.spacing.nodeNode': '60'
  //    'elk.spacing.edgeEdge': '20'
  //    'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP'
  //    'elk.portConstraints': 'FIXED_ORDER'
  //
  // 3. Run ELK (single pass via elk.bundled.js)
  // 4. Apply positions to nodes
  // 5. Extract edge routes (orthogonal bend points)
  // 6. Return positioned nodes + routed edges
  //
  // Keep LRU cache (reuse from elk-layout.ts pattern, 5 entries)
}
```

Important: reuse the same `elk.bundled.js` import pattern. Do NOT wrap in a custom worker.

**Step 1:** Create `src/layout/schema-layout.ts`
**Step 2:** Run `npm run build && npm run lint`
**Step 3:** Commit: `feat: 1-pass flat ELK layout for schema cards`

### Task 6.2: Card Measurement

**Files:**
- Create: `src/layout/measure-cards.ts`

Measure card dimensions before layout. Cards are HTML — need to render hidden, measure, then pass dimensions to ELK.

```typescript
/**
 * Measure schema card dimensions by rendering them off-screen.
 * Returns width/height per card ID.
 * Must run before ELK layout.
 */
export function measureCardDimensions(
  cards: SchemaCard[],
): Map<string, { width: number; height: number }> {
  // Render cards into a hidden container, measure offsetWidth/offsetHeight
  // Row count determines height, longest row determines width
  // Add padding for header + dividers + card chrome
}
```

Alternative approach: calculate dimensions from row count without DOM measurement (simpler, deterministic). Each row has fixed height (~28px), header ~40px, divider ~16px, padding ~24px. Width based on longest expression string character count.

**Step 1:** Create `src/layout/measure-cards.ts` — start with calculation approach
**Step 2:** Run `npm run build && npm run lint`
**Step 3:** Commit: `feat: card dimension calculation for layout`

---

## Phase 7: Store Updates

### Task 7.1: Dimension State

**Files:**
- Modify: `src/store/viewer-store.ts`

Add dimension-related state and actions to the viewer store.

```typescript
// New state fields:
dimensions: Dimension[];
classifiedEdges: ClassifiedEdge[];
schemaCards: SchemaCard[];
activeDimensions: Set<string>;   // which dimensions are toggled on (all by default)

// Subgraph state:
subgraphMode: 'full' | 'upstream' | 'downstream';
subgraphTarget: string | null;   // node ID or type name
subgraphResult: SubgraphResult | null;

// New actions:
toggleDimension: (name: string) => void;
soloDimension: (name: string) => void;    // show only this dimension
resetDimensions: () => void;              // show all
enterSubgraph: (mode: 'upstream' | 'downstream', target: string) => void;
exitSubgraph: () => void;
```

Update `parse()` action to also run `detectDimensions()`, `classifyEdges()`, and `buildSchemaCards()` after building the authorization graph.

Update `getVisibleGraph()` (or create new `getVisibleSchemaFlow()`) to apply dimension toggles and subgraph filtering.

**Step 1:** Add new state fields and actions
**Step 2:** Wire `parse()` to run dimension detection and card building
**Step 3:** Run `npm run build && npm run lint`
**Step 4:** Commit: `feat: dimension and subgraph state in viewer store`

### Task 7.2: Hover Store Update

**Files:**
- Modify: `src/store/hover-store.ts`

Update for row-level hover with directional semantics.

```typescript
// Updated state:
hoveredRowId: string | null;          // replaces hoveredNodeId
hoveredCardId: string | null;         // which card header is hovered
hoverDirection: 'upstream' | 'downstream' | null;
highlightedNodeIds: Set<string>;      // nodes on highlighted paths
highlightedEdgeIds: Set<string>;      // edges on highlighted paths
bridgeNodeIds: Set<string>;           // binding nodes enabling hovered paths

// Updated actions:
setHoveredRow: (rowId: string | null, allEdges: AuthorizationEdge[]) => void;
setHoveredCard: (cardId: string | null, allEdges: AuthorizationEdge[]) => void;
```

When a row is hovered: run `extractUpstream()` (for permission rows) or `extractDownstream()` (for relation rows) and populate highlighted sets.

When a card header is hovered: run `extractDownstream()` for that type.

**Step 1:** Update hover store
**Step 2:** Run `npm run build && npm run lint`
**Step 3:** Commit: `feat: row-level directional hover store`

---

## Phase 8: Wire It Together

### Task 8.1: Update FgaGraph

**Files:**
- Modify: `src/canvas/FgaGraph.tsx`

Switch FgaGraph from old pipeline to new:
- Import `SchemaCard` node type instead of TypeNode/RelationNode/PermissionNode
- Import `DimensionEdge` edge type instead of DirectEdge/ComputedEdge/TuplesetDepEdge
- Use `toSchemaFlow()` instead of `toFlowElements()`
- Use `layoutSchemaCards()` instead of `getLayoutedElements()`
- Wire click handlers for subgraph enter/exit (click card header → downstream, click permission row → upstream)
- Wire hover handlers for row-level highlighting
- Add Esc key handler for subgraph exit
- Add Minimap and Controls (React Flow built-ins)

This is the big switchover task. After this, the app renders with the new pipeline.

**Step 1:** Update nodeTypes and edgeTypes maps
**Step 2:** Replace conversion + layout calls
**Step 3:** Wire click/hover handlers
**Step 4:** Add Minimap + Controls
**Step 5:** Run `npm run build && npm run lint`
**Step 6:** Visual verification in browser
**Step 7:** Commit: `feat: switch to ERD card rendering pipeline`

### Task 8.2: Delete Old Components

**Files:**
- Delete: `src/canvas/nodes/TypeNode.tsx`
- Delete: `src/canvas/nodes/RelationNode.tsx`
- Delete: `src/canvas/nodes/PermissionNode.tsx`
- Delete: `src/canvas/nodes/useNodeInteraction.ts`
- Delete: `src/canvas/edges/DirectEdge.tsx`
- Delete: `src/canvas/edges/ComputedEdge.tsx`
- Delete: `src/canvas/edges/TuplesetDepEdge.tsx`
- Delete: `src/canvas/edges/useEdgeInteraction.ts`
- Delete: `src/canvas/fgaToFlow.ts`
- Delete: `src/layout/elk-layout.ts` (keep elk-path.ts if still used)

**Step 1:** Delete all old node/edge components and old conversion/layout
**Step 2:** Run `npm run build && npm run lint` — fix any remaining imports
**Step 3:** Commit: `refactor: remove old compound node pipeline`

---

## Phase 9: UI Controls

### Task 9.1: Dimension Toggle Panel

**Files:**
- Create: `src/toolbar/DimensionPanel.tsx`
- Modify: `src/toolbar/Toolbar.tsx`

Small horizontal bar of colored chips, one per detected dimension. Each chip toggleable on/off. Modifier+click for solo mode.

**Step 1:** Create `DimensionPanel.tsx`
**Step 2:** Add to Toolbar
**Step 3:** Run `npm run build && npm run lint`
**Step 4:** Commit: `feat: dimension toggle panel`

### Task 9.2: Card Expand/Collapse

**Files:**
- Modify: `src/canvas/nodes/SchemaCard.tsx`
- Modify: `src/store/viewer-store.ts`

Add collapse state per card. Collapsed card shows only header + row count badge. Store tracks `collapsedCards: Set<string>`.

Double-click card header to toggle. Collapsed cards have reduced dimensions → triggers re-layout.

**Step 1:** Add collapse state to store
**Step 2:** Add collapse rendering to SchemaCard
**Step 3:** Run `npm run build && npm run lint`
**Step 4:** Commit: `feat: card expand/collapse`

### Task 9.3: Updated Legend

**Files:**
- Modify: `src/legend/LegendPanel.tsx`

Replace old edge type legend with:
- Dimension color key (one entry per detected dimension with name + color)
- Row icon key (circle = relation, diamond = permission, dot = binding)
- Type restriction edge style sample

**Step 1:** Update LegendPanel
**Step 2:** Run `npm run build && npm run lint`
**Step 3:** Commit: `feat: dimension-aware legend`

### Task 9.4: Type Filtering

**Files:**
- Modify: `src/toolbar/Toolbar.tsx` or `src/toolbar/CommandPalette.tsx`

Type filtering now shows/hides entire cards (simpler than before — no compound child management). Use existing `filters.types` state.

Permissions-only toggle collapses the relations section on all cards.

**Step 1:** Wire type filter to card visibility
**Step 2:** Wire permissions-only toggle
**Step 3:** Run `npm run build && npm run lint`
**Step 4:** Commit: `feat: type filtering and permissions-only toggle`

### Task 9.5: Command Palette Update

**Files:**
- Modify: `src/toolbar/CommandPalette.tsx`

Update search to navigate to cards and specific rows within cards. Results grouped by type, showing relation/permission names. Selecting a result focuses the card and optionally scrolls to / highlights the row.

**Step 1:** Update search results to schema card structure
**Step 2:** Run `npm run build && npm run lint`
**Step 3:** Commit: `feat: command palette for schema cards`

---

## Phase 10: Path Tracing Polish

### Task 10.1: Expression Annotation During Trace

**Files:**
- Modify: `src/canvas/nodes/SchemaCard.tsx`

When a path trace is active, permission rows on the traced path annotate their expression text:
- Bold/highlight the specific term that's on the path
- E.g., `admin | director | manager | **MEMBER**` with "member" in accent color

This requires the SchemaCard to receive trace state (which terms are active) from the store.

**Step 1:** Add expression term highlighting logic
**Step 2:** Run `npm run build && npm run lint`
**Step 3:** Commit: `feat: expression annotation during path trace`

### Task 10.2: Recursive Hierarchy Indicators

**Files:**
- Modify: `src/canvas/nodes/SchemaCard.tsx`
- Modify: `src/graph/dimensions.ts`

Detect self-referencing dimensions (where sourceType appears in connectedTypes — e.g., `category#parent: [category]`). Mark these binding rows with an info icon + tooltip: "Permission can be inherited from parent [type]."

**Step 1:** Add self-referencing detection to `detectDimensions()`
**Step 2:** Add info icon to binding rows for recursive dimensions
**Step 3:** Run `npm run build && npm run lint`
**Step 4:** Commit: `feat: recursive hierarchy indicators on binding rows`

### Task 10.3: Subgraph Transitions

**Files:**
- Modify: `src/canvas/FgaGraph.tsx`

Animate subgraph enter/exit:
- Enter: non-relevant cards fade out, remaining cards animate to new positions
- Exit (Esc): all cards fade in, animate to full-graph positions
- Use React Flow's built-in node animation (CSS transform transitions)

**Step 1:** Add transition CSS for subgraph enter/exit
**Step 2:** Run `npm run build && npm run lint`
**Step 3:** Commit: `feat: animated subgraph transitions`

---

## Phase Summary

| Phase | Tasks | What it delivers |
|-------|-------|-----------------|
| 1 | 1.1–1.4 | Types, dimension detection, schema cards, subgraph extraction |
| 2 | 2.1 | Dimension color palette |
| 3 | 3.1–3.2 | SchemaCard component + row interaction hook |
| 4 | 4.1–4.2 | DimensionEdge component + edge interaction hook |
| 5 | 5.1 | schemaToFlow conversion |
| 6 | 6.1–6.2 | 1-pass flat ELK layout + card measurement |
| 7 | 7.1–7.2 | Store updates (dimensions, subgraph, row-level hover) |
| 8 | 8.1–8.2 | Wire together + delete old components |
| 9 | 9.1–9.5 | UI controls (dimension panel, collapse, legend, filter, palette) |
| 10 | 10.1–10.3 | Path tracing polish (expression annotation, recursion, animation) |

**First visual result:** After Phase 8 — the app renders with ERD cards and dimension edges.

**Phases 1–7** build new systems alongside old. **Phase 8** swaps the pipeline. **Phases 9–10** add UI polish and interaction refinement.
