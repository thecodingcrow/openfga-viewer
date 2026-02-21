# Stack Research

**Domain:** Compound graph layout + edge routing for hierarchical authorization model visualization
**Researched:** 2026-02-21
**Confidence:** MEDIUM-HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| elkjs | ^0.11.0 (current) | Hierarchical compound layout engine | Only viable browser library for layered compound graph layout with cross-hierarchy edge routing. 0.11.0 is latest (Sept 2024), based on ELK 0.11.0. No alternative exists that handles compound nodes with cross-hierarchy edges. |
| @xyflow/react | ^12.10.1 (current) | Canvas rendering, node/edge components, interaction | Already in use. v12.5.0+ fixed fitView timing (no more rAF hacks). v12.10.0 added zIndexMode. Sub-flow support (parentId) works well with ELK compound output. |
| React 19 | ^19.2.0 (current) | UI framework | Already in use. No version change needed. |
| Zustand 5 | ^5.0.11 (current) | State management | Already in use. No version change needed. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @jalez/react-flow-smart-edge | latest | A* pathfinding edge routing around nodes | Only if ELK ORTHOGONAL routing proves insufficient for inter-compound edges. Maintained fork (June 2025) of archived @tisoap/react-flow-smart-edge. Uses A*/JPS pathfinding. Does NOT support compound nodes natively -- treat as fallback for specific edge types only. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vite 7 | Build tooling | Already in use. No change. |
| TypeScript 5.9 strict | Type safety | Already in use. No change. |

## The Core Problem and Recommendation

The current 3-pass ELK layout (hierarchical pass -> grid redistribution -> root repack) exists because ELK has no native "max compound size" constraint. ELK only supports minimum size constraints on nodes, not maximum. This forces the manual redistribution pass, which then invalidates all ELK-computed edge routes, which then requires the repack pass.

**The recommendation is NOT to replace the 3-pass system. It is to make ELK's single-pass output good enough that fewer compounds need redistribution, and to switch to ORTHOGONAL routing so that edges survive redistribution via simple segment translation.**

## ELK Configuration: Prescriptive Recommendations

### Switch from POLYLINE to ORTHOGONAL Edge Routing

**Confidence: HIGH** (verified via ELK official docs)

| Option | Current Value | Recommended Value | Why |
|--------|---------------|-------------------|-----|
| `elk.edgeRouting` | `POLYLINE` | `ORTHOGONAL` | ORTHOGONAL produces rectilinear (right-angle) edge paths. These paths are (a) more readable for hierarchical dependency graphs, (b) easier to translate when compounds get repositioned (each segment is axis-aligned, so translating by dx/dy preserves validity), (c) better at avoiding node overlap because ELK reserves routing channels between nodes. POLYLINE produces diagonal segments that look messy in compound layouts and are harder to adjust post-layout. |

**Rationale:** The current system discards ALL edge routes when redistribution happens because POLYLINE bend points become invalid when nodes move. ORTHOGONAL segments can be translated per-axis without invalidation. This is the single highest-impact change.

### Use BRANDES_KOEPF Node Placement (Default) Instead of NETWORK_SIMPLEX

**Confidence: MEDIUM** (ELK docs + community evidence)

| Option | Current Value | Recommended Value | Why |
|--------|---------------|-------------------|-----|
| `elk.layered.nodePlacement.strategy` | `NETWORK_SIMPLEX` | `BRANDES_KOEPF` | BRANDES_KOEPF (ELK default) optimizes for fewer edge crossings and better visual balance. NETWORK_SIMPLEX optimizes for straight long edges, which sounds good but actually produces worse results for compound graphs because it prioritizes inter-layer straightness over intra-compound compactness. BRANDES_KOEPF with `fixedAlignment: BALANCED` gives more uniform node distribution within compounds. |

Additional sub-options to set:

```
'elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED'
'elk.layered.nodePlacement.bk.edgeStraightening': 'IMPROVE_STRAIGHTNESS'
```

### Add Port Constraints for Better Handle-Aware Routing

**Confidence: HIGH** (verified via ELK docs and React Flow elkjs-multiple-handles example)

| Option | Current Value | Recommended Value | Why |
|--------|---------------|-------------------|-----|
| `elk.portConstraints` (per node) | not set | `FIXED_SIDE` | Tells ELK that handles/ports are fixed to specific sides of nodes (bottom for sources in TB, right for sources in LR). Without this, ELK is free to route edges to any side, producing unexpected paths. FIXED_SIDE constrains port placement to specific sides while still allowing ELK to order ports within each side. |
| `elk.port.side` (per port) | not set | `SOUTH` (source) / `NORTH` (target) for TB | Specifies which side each port is on. Combined with FIXED_SIDE, this gives ELK accurate handle position information. |

Implementation: Define ports on each ELK child node matching React Flow's handle positions:

```typescript
// For TB direction:
children: children.map(c => ({
  id: c.id,
  width: c.measured?.width ?? 120,
  height: c.measured?.height ?? 40,
  ports: [
    { id: `${c.id}_source`, properties: { 'port.side': 'SOUTH' } },
    { id: `${c.id}_target`, properties: { 'port.side': 'NORTH' } },
  ],
  properties: { 'portConstraints': 'FIXED_SIDE' },
})),
```

Then reference ports in edges:

```typescript
edges: validEdges.map(edge => ({
  id: edge.id,
  sources: [`${edge.source}_source`],
  targets: [`${edge.target}_target`],
})),
```

### Enable mergeHierarchyEdges and Tune hierarchicalSweepiness

**Confidence: MEDIUM** (ELK docs, default values confirmed)

| Option | Current Value | Recommended Value | Why |
|--------|---------------|-------------------|-----|
| `elk.layered.mergeHierarchyEdges` | not set (default: true) | `true` (explicit) | When cross-hierarchy edges share endpoints, they share hierarchical ports instead of creating one port per edge. Reduces visual clutter at compound boundaries. Already the default, but should be explicit. |
| `elk.layered.crossingMinimization.hierarchicalSweepiness` | not set (default: 0.1) | `0.3` | Controls how aggressively cross-hierarchy edges influence node ordering. Higher values (toward 1.0) let cross-hierarchy edges dominate crossing minimization. 0.3 is a moderate increase from 0.1 default -- enough to reduce inter-compound edge tangles without destabilizing intra-compound layout. |

### Increase Compound Padding and Spacing

**Confidence: HIGH** (direct ELK config, easy to tune)

| Option | Current Value | Recommended Value | Why |
|--------|---------------|-------------------|-----|
| Compound `elk.padding` | `top=40,left=4,bottom=12,right=4` | `top=48,left=16,bottom=16,right=16` | Current left/right padding of 4px gives no room for ORTHOGONAL edge routing channels. ELK needs space between compound edges and child nodes to route edges cleanly. 16px minimum on sides. |
| `elk.layered.spacing.edgeNodeBetweenLayers` | `8` | `12` | More space between edges and nodes in different layers reduces visual clutter. |
| `elk.spacing.nodeNode` | `22` | `24` | Slightly more breathing room between sibling nodes. |

### Remove favorStraightEdges

**Confidence: MEDIUM** (ELK docs)

| Option | Current Value | Recommended Value | Why |
|--------|---------------|-------------------|-----|
| `elk.layered.nodePlacement.favorStraightEdges` | `true` | remove | This option fights with BRANDES_KOEPF's BALANCED alignment. It pulls nodes toward straight-edge positions, which disrupts the balanced compound layout. It was useful with NETWORK_SIMPLEX but counterproductive with BRANDES_KOEPF. |

## Full Recommended ELK Configuration

```typescript
// Root graph options
const rootOptions = {
  'elk.algorithm': 'layered',
  'elk.direction': direction === 'TB' ? 'DOWN' : 'RIGHT',
  'elk.edgeRouting': 'ORTHOGONAL',
  'elk.layered.spacing.nodeNodeBetweenLayers': '28',
  'elk.spacing.nodeNode': '24',
  'elk.layered.spacing.edgeEdgeBetweenLayers': '8',
  'elk.layered.spacing.edgeNodeBetweenLayers': '12',
  'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
  'elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
  'elk.layered.nodePlacement.bk.edgeStraightening': 'IMPROVE_STRAIGHTNESS',
  'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
  'elk.layered.crossingMinimization.hierarchicalSweepiness': '0.3',
  'elk.layered.mergeHierarchyEdges': 'true',
  'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
  'json.edgeCoords': 'ROOT',
};

// Compound node options
const compoundOptions = {
  'elk.padding': '[top=48,left=16,bottom=16,right=16]',
  'elk.layered.spacing.nodeNodeBetweenLayers': '24',
  'elk.layered.spacing.edgeEdgeBetweenLayers': '6',
  'elk.layered.spacing.edgeNodeBetweenLayers': '10',
};

// Child node options (relations, permissions)
// Each child gets ports matching React Flow handles
const childNodeWithPorts = (id: string, w: number, h: number, dir: 'TB' | 'LR') => ({
  id,
  width: w,
  height: h,
  ports: [
    {
      id: `${id}_src`,
      properties: { 'port.side': dir === 'TB' ? 'SOUTH' : 'EAST' },
    },
    {
      id: `${id}_tgt`,
      properties: { 'port.side': dir === 'TB' ? 'NORTH' : 'WEST' },
    },
  ],
  properties: { 'portConstraints': 'FIXED_SIDE' },
});
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| ELK layered with ORTHOGONAL | ELK layered with SPLINES (SLOPPY mode) | If users explicitly want "curvy" edges. SLOPPY splines can overlap nodes -- not suitable for dense compound graphs. CONSERVATIVE splines look orthogonal anyway. |
| ELK INCLUDE_CHILDREN (single hierarchy pass) | ELK SEPARATE_CHILDREN (per-compound passes) | If cross-compound edges are rare. SEPARATE_CHILDREN gives better intra-compound layout quality but cannot route cross-hierarchy edges properly. For FGA models, cross-compound edges are the norm (type A's relation references type B), so INCLUDE_CHILDREN is required. |
| BRANDES_KOEPF node placement | NETWORK_SIMPLEX node placement | Only if the graph is a tall, narrow chain where long-edge straightness matters more than balance. FGA models are wide and bushy, making BRANDES_KOEPF the better choice. |
| Custom 3-pass layout (current) | Single ELK pass only | If no compound exceeds ~1100px. The 3-pass system is necessary because ELK cannot constrain max compound size. However, with ORTHOGONAL routing + better spacing, fewer compounds should exceed the threshold, reducing how often passes 2+3 run. |
| ELK for layout | Cytoscape.js fcose | If you abandon React Flow. Cytoscape.js has its own rendering layer and compound support via fcose (force-directed compound spring embedder). But fcose is force-directed, not layered -- it cannot produce the top-down hierarchical layout that FGA models need. Not a viable alternative. |
| ELK for layout | yFiles | If budget allows. yFiles has the best compound graph layout in the industry but costs $15K+/year for commercial use. Not viable for an open-source tool. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `elk.edgeRouting: POLYLINE` | Produces diagonal edge segments that become invalid when compounds are repositioned. Forces discarding all edge routes on redistribution. Looks messy in compound layouts. | `ORTHOGONAL` -- axis-aligned segments are translatable and readable. |
| `elk.layered.nodePlacement.strategy: NETWORK_SIMPLEX` with compound graphs | Optimizes for inter-layer straightness, which pulls child nodes out of position within compounds. Fights with `favorStraightEdges` and produces unbalanced compound interiors. | `BRANDES_KOEPF` with `fixedAlignment: BALANCED` -- better intra-compound balance. |
| `@tisoap/react-flow-smart-edge` | Archived December 2025. 22+ security vulnerabilities. Not maintained. | `@jalez/react-flow-smart-edge` if smart edge routing is needed. Or rely on ELK ORTHOGONAL routing. |
| `dagre` for layout | Does not support compound nodes / sub-flows at all. Cannot handle hierarchy. | ELK is the only viable option. |
| Wrapping `elk.bundled.js` in a custom Web Worker | Vite renames the global `Worker` constructor when bundling into a worker, breaking the internal worker that `elk.bundled.js` creates. Results in `_Worker is not a constructor`. | Import `elk.bundled.js` directly on main thread. It handles its own off-thread computation internally. |
| `elk.layered.wrapping.strategy: SINGLE_EDGE` or `MULTI_EDGE` on compound children | Graph wrapping splits a graph into chunks placed side-by-side -- useful for constraining overall width. But it works at the graph level, not per-compound-node. Cannot replace the grid redistribution pass for individual oversized compounds. | Keep the custom grid redistribution (Pass 2) for compounds exceeding MAX_COMPOUND_SIZE. |
| Double `requestAnimationFrame` for fitView timing | React Flow 12.5.0+ fixed fitView so it works synchronously after setNodes. The double-rAF pattern is no longer needed. | Call `reactFlow.fitView()` directly after setting nodes. |

## Stack Patterns by Variant

**If the model is small (< 30 nodes, no compound exceeds 1100px):**
- Single ELK pass is sufficient (passes 2+3 never trigger)
- ORTHOGONAL + BRANDES_KOEPF + ports give clean layout in one pass
- LRU cache means repeat layouts are free

**If the model is large (50+ nodes, wide compounds):**
- 3-pass system remains necessary
- With ORTHOGONAL routing, edge routes within non-redistributed compounds survive repack (translate by delta)
- Edge routes FOR redistributed compounds must still be discarded (grid positions are not ELK-computed)
- Consider increasing MAX_COMPOUND_SIZE to 1300px with wider padding to let ELK handle more cases natively

**If cross-compound edges dominate (typical FGA models):**
- INCLUDE_CHILDREN is mandatory
- Increase `hierarchicalSweepiness` to 0.3-0.5
- Use ports with FIXED_SIDE so ELK knows where handles are
- mergeHierarchyEdges reduces port clutter at compound boundaries

## Edge Route Preservation Strategy After Redistribution

The current code discards ALL edge routes when ANY compound is redistributed. With ORTHOGONAL routing, a smarter strategy is possible:

1. **Intra-compound edges within non-redistributed compounds:** Preserve. Translate all points by the compound's repack delta (dx, dy). Already implemented.
2. **Intra-compound edges within redistributed compounds:** Discard. Grid positions are manually computed, so ELK routes are invalid.
3. **Inter-compound edges (cross-hierarchy):** With ORTHOGONAL routing, these consist of horizontal and vertical segments. After repack, translate the source-side segments by the source compound's delta and the target-side segments by the target compound's delta. Bend points between compounds need adjustment but not full discard.
4. **Fallback:** For any edge whose route cannot be salvaged, fall back to React Flow's `getSmoothStepPath`. This is already the current behavior and produces acceptable results for ORTHOGONAL-style edges.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| elkjs@^0.11.0 | @xyflow/react@^12.10.1 | No compatibility issues. ELK output is consumed via custom conversion code, not a direct integration. |
| @xyflow/react@^12.5.0+ | React 19 | fitView timing fix requires 12.5.0+. Current 12.10.1 is fine. |
| @jalez/react-flow-smart-edge | @xyflow/react@^12.0.0 | Compatible with v12. Only needed if ELK ORTHOGONAL is insufficient for specific edge types. |

## React Flow 12.5.0+ fitView Improvement

**Confidence: HIGH** (verified via official React Flow changelog)

The current `FgaGraph.tsx` uses a double `requestAnimationFrame` to delay `fitView` after layout:

```typescript
// CURRENT (can be simplified)
window.requestAnimationFrame(() => {
  window.requestAnimationFrame(() => {
    reactFlow.fitView({ duration: 200, minZoom: 0.35, padding: 0.1 });
  });
});
```

React Flow 12.5.0+ supports calling `fitView` immediately after `setNodes`:

```typescript
// RECOMMENDED
setNodes(laid);
setEdges(laidEdges);
reactFlow.fitView({ duration: 200, minZoom: 0.35, padding: '10%' });
```

Additionally, 12.5.0 added per-side padding with mixed units:

```typescript
fitView({
  padding: { top: '50px', bottom: '50px', left: '10%', right: '10%' },
});
```

## Sources

- [ELK Layered Algorithm Reference](https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-layered.html) -- all layout options, algorithm phases (HIGH confidence)
- [ELK Edge Routing Options](https://eclipse.dev/elk/reference/options/org-eclipse-elk-edgeRouting.html) -- ORTHOGONAL vs POLYLINE vs SPLINES (HIGH confidence)
- [ELK Hierarchy Handling](https://eclipse.dev/elk/reference/options/org-eclipse-elk-hierarchyHandling.html) -- INCLUDE_CHILDREN vs SEPARATE_CHILDREN (HIGH confidence)
- [ELK Node Placement Strategy](https://eclipse.dev/elk/reference/options/org-eclipse-elk-layered-nodePlacement-strategy.html) -- BRANDES_KOEPF vs NETWORK_SIMPLEX (HIGH confidence)
- [ELK Coordinate System](https://eclipse.dev/elk/documentation/tooldevelopers/graphdatastructure/coordinatesystem.html) -- json.edgeCoords ROOT behavior (HIGH confidence)
- [ELK JSON Format](https://eclipse.dev/elk/documentation/tooldevelopers/graphdatastructure/jsonformat.html) -- edge section coordinates, edge containment (HIGH confidence)
- [ELK mergeHierarchyEdges](https://eclipse.dev/elk/reference/options/org-eclipse-elk-layered-mergeHierarchyEdges.html) -- cross-hierarchy edge consolidation (HIGH confidence)
- [ELK hierarchicalSweepiness](https://eclipse.dev/elk/reference/options/org-eclipse-elk-layered-crossingMinimization-hierarchicalSweepiness.html) -- crossing minimization tuning (MEDIUM confidence)
- [ELK Graph Wrapping](https://eclipse.dev/elk/reference/options/org-eclipse-elk-layered-wrapping-strategy.html) -- why it doesn't replace compound redistribution (HIGH confidence)
- [ELK Node Size Constraints](https://eclipse.dev/elk/reference/options/org-eclipse-elk-nodeSize-constraints.html) -- confirms no max-size constraint exists (HIGH confidence)
- [ELK Port Constraints](https://eclipse.dev/elk/reference/options/org-eclipse-elk-portConstraints.html) -- FIXED_SIDE for handle-aware routing (HIGH confidence)
- [ELK Layered Overview Blog Post](https://eclipse.dev/elk/blog/posts/2025/25-08-21-layered.html) -- 5-phase algorithm description (HIGH confidence)
- [ELK INCLUDE_CHILDREN Bug #700](https://github.com/eclipse-elk/elk/issues/700) -- fixed in ELK, important to know about (HIGH confidence)
- [React Flow Sub Flows Guide](https://reactflow.dev/learn/layouting/sub-flows) -- parentId, compound node support (HIGH confidence)
- [React Flow ELKjs Integration](https://reactflow.dev/examples/layout/elkjs) -- official elkjs example (HIGH confidence)
- [React Flow ELKjs Multiple Handles](https://reactflow.dev/examples/layout/elkjs-multiple-handles) -- port-based layout with FIXED_ORDER (HIGH confidence)
- [React Flow 12.5.0 Changelog](https://reactflow.dev/whats-new/2025-03-27) -- fitView fix, no more rAF hacks (HIGH confidence)
- [React Flow + ELK Subflow Discussion #3495](https://github.com/xyflow/xyflow/discussions/3495) -- hierarchical data conversion patterns (MEDIUM confidence)
- [elkjs Releases](https://github.com/kieler/elkjs/releases) -- version history, 0.11.0 is latest (HIGH confidence)
- [elkjs npm](https://www.npmjs.com/package/elkjs) -- 533K weekly downloads, actively maintained (HIGH confidence)
- Context7: `/kieler/elkjs` -- INCLUDE_CHILDREN example, layout options API (HIGH confidence)
- Context7: `/xyflow/web` -- React Flow sub-flows, elkjs integration patterns (HIGH confidence)
- [@jalez/react-flow-smart-edge](https://github.com/Jalez/react-flow-smart-edge) -- maintained fork, A*/JPS pathfinding (MEDIUM confidence)

---
*Stack research for: compound graph layout + edge routing*
*Researched: 2026-02-21*
