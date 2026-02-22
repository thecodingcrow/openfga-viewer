---
phase: quick
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/graph/traversal.ts
  - src/types.ts
  - src/canvas/fgaToFlow.ts
  - src/canvas/nodes/TypeCardNode.tsx
autonomous: true
requirements: []

must_haves:
  truths:
    - "Upstream subgraph from document#can_view surfaces folder card when TTU edges connect via document#viewer"
    - "Intra-card expansion (computed/tupleset-dep) loops back into cross-card BFS for newly discovered rows"
    - "Relation and permission rows with incoming TTU edges show a colored dot instead of the neutral grey dot"
    - "No regression: downstream subgraph navigation still shows correct cards and rows"
    - "No regression: hover highlighting still works correctly"
  artifacts:
    - path: "src/graph/traversal.ts"
      provides: "Unified single-phase BFS in computeSubgraph"
      contains: "all edge types followed in a single queue"
    - path: "src/types.ts"
      provides: "ttuDimensionColor field on CardRow"
    - path: "src/canvas/fgaToFlow.ts"
      provides: "Populates ttuDimensionColor for rows that have incoming TTU edges"
    - path: "src/canvas/nodes/TypeCardNode.tsx"
      provides: "Renders ttuDimensionColor on the dot for relation/permission rows"
  key_links:
    - from: "computeSubgraph unified BFS"
      to: "NavigationFrame.visibleTypeIds + relevantRowIds"
      via: "navigateToSubgraph in viewer-store.ts"
      pattern: "computeSubgraph.*direction.*nodes.*edges"
    - from: "fgaToFlow.ts permission/relation rows"
      to: "CardRow.ttuDimensionColor"
      via: "TTU edge lookup on edge.target === node.id"
      pattern: "ttuDimensionColor"
---

<objective>
Fix two related issues with subgraph navigation and inherited permission visibility.

Purpose: Upstream BFS silently drops TTU-linked type cards because computed-edge
expansion never feeds back into cross-card traversal. Additionally, users cannot
distinguish inherited (TTU) permissions from direct ones on a card row.

Output:
- src/graph/traversal.ts — unified single-phase BFS replacing the broken two-phase approach
- src/types.ts — ttuDimensionColor field on CardRow
- src/canvas/fgaToFlow.ts — populates ttuDimensionColor from TTU edge lookup
- src/canvas/nodes/TypeCardNode.tsx — renders colored dot for TTU-inherited rows
</objective>

<execution_context>
@/Users/thedoc/.claude/get-shit-done/workflows/execute-plan.md
@/Users/thedoc/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/thedoc/DEV/personal/openfga-viewer/CLAUDE.md
@/Users/thedoc/DEV/personal/openfga-viewer/src/types.ts
@/Users/thedoc/DEV/personal/openfga-viewer/src/graph/traversal.ts
@/Users/thedoc/DEV/personal/openfga-viewer/src/canvas/fgaToFlow.ts
@/Users/thedoc/DEV/personal/openfga-viewer/src/canvas/nodes/TypeCardNode.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix computeSubgraph to use unified single-phase BFS</name>
  <files>src/graph/traversal.ts</files>
  <action>
Replace the two-phase `computeSubgraph` implementation with a single unified BFS.

The current bug: Phase 1 runs cross-card BFS (direct + ttu edges only), Phase 2
expands intra-card (computed + tupleset-dep edges only), but Phase 2 discoveries
never re-enter Phase 1. So when `document#can_view` expands intra-card to discover
`document#viewer`, the TTU edge `folder#viewer → document#viewer` is never traversed,
and `folder` never appears in the subgraph.

**New implementation for `computeSubgraph`:**

Remove the two-phase approach entirely. Replace with a single BFS that follows ALL
four edge types (`direct`, `ttu`, `computed`, `tupleset-dep`) in the correct direction.
Direction controls which side of the edge is traversed:
- `upstream` (backward): for each edge where `edge.target === current`, enqueue `edge.source`
- `downstream` (forward): for each edge where `edge.source === current`, enqueue `edge.target`

No edge-type filtering — all four types flow through the same queue. The traversal
naturally interleaves cross-card hops (direct, ttu) and intra-card hops (computed,
tupleset-dep) because they all use the same node ID space.

Seed the BFS with `startNodeId`. Collect all visited node IDs into `relevantRowIds`.
Derive `visibleTypeIds` by splitting each visited node ID on `#` and taking the first
part (e.g., `"document#viewer"` → `"document"`, `"user"` → `"user"`).

Keep the existing function signature unchanged:
```
computeSubgraph(
  startNodeId: string,
  direction: "upstream" | "downstream",
  nodes: AuthorizationNode[],
  edges: AuthorizationEdge[],
): { visibleTypeIds: Set<string>; relevantRowIds: Set<string> }
```

The `nodes` parameter is still needed for the signature but the unified BFS does not
need it for traversal (the old traceDownstream seeded from type children — that seeding
is now unnecessary because the BFS starting from a relation/type ID and following
computed edges intra-card achieves the same coverage).

Delete the now-unused `traceUpstream` and `traceDownstream` functions ONLY if they
have no other callers. Check: grep for `traceUpstream` and `traceDownstream` in
`src/store/hover-store.ts` and `src/canvas/` before removing. If they are used
elsewhere (e.g., hover store), keep them as-is. `computeSubgraph` simply won't
call them anymore.
  </action>
  <verify>npm run build 2>&1 | tail -20</verify>
  <done>
Build passes with no TypeScript errors. The `computeSubgraph` function body
contains no calls to `traceUpstream` or `traceDownstream` and uses a single
`while (queue.length > 0)` loop that handles all four edge types.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add ttuDimensionColor to CardRow and populate it in fgaToFlow</name>
  <files>src/types.ts, src/canvas/fgaToFlow.ts</files>
  <action>
**In `src/types.ts`:**

Add `ttuDimensionColor?: string` to the `CardRow` interface after `dimensionColor`:

```typescript
export interface CardRow {
  id: string;
  name: string;
  section: "binding" | "relation" | "permission";
  expression?: string;
  dimensionColor?: string;
  /** Dimension color if this row has an incoming TTU edge (inherited permission) */
  ttuDimensionColor?: string;
}
```

**In `src/canvas/fgaToFlow.ts`:**

Before building the `rows` arrays for each type card, build a lookup map from
row node ID to its TTU dimension color.

After `const dimensions = assignDimensionColors(rawDimensions);` and before the
`nodesByType` grouping loop, add:

```typescript
// Build lookup: rowId → TTU dimension color (for TTU-inherited rows)
const ttuColorByTarget = new Map<string, string>();
for (const edge of graph.edges) {
  if (edge.rewriteRule !== "ttu" || !edge.tuplesetRelation) continue;
  const dim = dimensions.get(edge.tuplesetRelation);
  if (dim) {
    ttuColorByTarget.set(edge.target, dim.color);
  }
}
```

Then when building `relation` rows:
```typescript
for (const node of relations) {
  rows.push({
    id: node.id,
    name: node.relation ?? node.id,
    section: "relation",
    ttuDimensionColor: ttuColorByTarget.get(node.id),
  });
}
```

And when building `permission` rows:
```typescript
for (const node of permissions) {
  rows.push({
    id: node.id,
    name: node.relation ?? node.id,
    section: "permission",
    expression: node.definition ? transformExpression(node.definition) : undefined,
    ttuDimensionColor: ttuColorByTarget.get(node.id),
  });
}
```

Binding rows do NOT get `ttuDimensionColor` — bindings already show their dimension
color via `dimensionColor`, and TTU edges don't target bindings.
  </action>
  <verify>npm run build 2>&1 | tail -20</verify>
  <done>
Build passes. `CardRow` has `ttuDimensionColor?: string`. The `ttuColorByTarget`
map is built from TTU edges in `toFlowElements` and the color is applied to
relation and permission rows that are targeted by TTU edges.
  </done>
</task>

<task type="auto">
  <name>Task 3: Render ttuDimensionColor dot in TypeCardNode for inherited rows</name>
  <files>src/canvas/nodes/TypeCardNode.tsx</files>
  <action>
In `RowItemComponent`, the dot indicator currently shows `row.dimensionColor` for
binding rows and `NEUTRAL_DOT` for all others.

Update the dot's `background` style to use `row.ttuDimensionColor` for
relation/permission rows when it is present:

```typescript
background:
  row.section === "binding"
    ? (row.dimensionColor ?? NEUTRAL_DOT)
    : (row.ttuDimensionColor ?? NEUTRAL_DOT),
```

Also add a `title` attribute to the dot span when `row.ttuDimensionColor` is set,
so hovering the dot shows a tooltip explaining the inheritance:

```typescript
<span
  title={row.ttuDimensionColor != null ? "Inherited via TTU" : undefined}
  style={{
    display: "inline-block",
    width: 6,
    height: 6,
    borderRadius: "50%",
    flexShrink: 0,
    background:
      row.section === "binding"
        ? (row.dimensionColor ?? NEUTRAL_DOT)
        : (row.ttuDimensionColor ?? NEUTRAL_DOT),
  }}
/>
```

No other changes to `RowItemComponent` or `TypeCardNodeComponent`. The `RowItem`
memo wrapper and all existing props remain unchanged — `ttuDimensionColor` comes
through on the `row` prop which `RowItem` already receives.

Do NOT add `ttuDimensionColor` to `RowItemComponent`'s explicit prop list — it
arrives via `row: CardRow` and is accessed as `row.ttuDimensionColor`.
  </action>
  <verify>npm run build 2>&1 | tail -20 && npm run lint 2>&1 | tail -20</verify>
  <done>
Build and lint pass. Relation and permission rows that are targets of TTU edges
display a colored dot matching the dimension color instead of the neutral grey.
A tooltip "Inherited via TTU" appears on hover of those dots.
  </done>
</task>

</tasks>

<verification>
After all three tasks complete:

1. `npm run build` exits 0 with no TypeScript errors
2. `npm run lint` exits 0 with no lint errors
3. Manual smoke test: load the sample FGA model, click a permission row that has
   TTU-based inheritance (e.g., `document#can_view`), verify the upstream subgraph
   includes the folder/parent type card (Bug 1 fix)
4. Inspect a type card for a type that inherits permissions via TTU — the affected
   rows should show colored dots matching the dimension color (Bug 2 fix)
5. Hover highlighting still works correctly (no regression in traceUpstream /
   traceDownstream which remain unchanged for hover-store use)
</verification>

<success_criteria>
- `computeSubgraph` uses a single unified BFS; two-phase approach is gone
- Upstream subgraph navigation surfaces all type cards reachable via any edge type
- `CardRow.ttuDimensionColor` populated for rows targeted by TTU edges
- TTU-targeted rows display the dimension color dot with "Inherited via TTU" tooltip
- Build and lint pass clean
</success_criteria>

<output>
After completion, create `.planning/quick/1-fix-subgraph-bfs-to-interleave-cross-car/1-SUMMARY.md`
</output>
