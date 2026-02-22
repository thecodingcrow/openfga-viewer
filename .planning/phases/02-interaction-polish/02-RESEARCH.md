# Phase 2: Interaction & Polish - Research

**Researched:** 2026-02-22
**Domain:** Subgraph navigation, command palette, inspect panel, card collapse, HUD theming, animated transitions
**Confidence:** HIGH

## Summary

Phase 2 transforms the static ERD-card visualization into an interactive exploration tool. The core challenge is subgraph navigation -- clicking permission rows or card headers to drill into upstream/downstream subgraphs with animated transitions, a navigation stack with browser history integration, and breadcrumb trail. Secondary features include an inspect panel (collapsible tree view replacing the legend), a command palette with fuzzy search, card collapse, recursive hierarchy indicators, and a comprehensive HUD visual refresh.

The existing codebase already provides strong foundations: `traceUpstream()` and `traceDownstream()` in `traversal.ts` compute the exact node sets needed for subgraph filtering, the CSS transition on `.react-flow__node` already animates position changes (`transform 300ms`), and the Zustand store has `focusMode` and `selectedNodeId` state ready for extension. The primary technical risk is the two-phase animation (fade out non-relevant cards, then animate remaining cards to new ELK positions) which requires careful sequencing with React Flow's render cycle.

**Primary recommendation:** Build subgraph navigation as a stack-based state machine in the Zustand store, reuse existing BFS traversal functions for subgraph computation, leverage the existing CSS `transform` transition on `.react-flow__node` for position animation, and use `opacity` transitions for fade in/out. No new dependencies are needed except potentially `fuse.js` for fuzzy search.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Click a permission row to enter upstream subgraph; click a card header to enter downstream subgraph
- Downstream subgraph shows full transitive reach (all types reachable, not just direct neighbors)
- Transition: non-relevant cards fade out first, then remaining cards animate to new ELK-computed positions (two-phase)
- Unlimited nesting -- subgraph stack grows with each drill-in
- Breadcrumb trail in bottom-left corner shows full navigation path; each segment is clickable to jump back
- Esc key pops one level; breadcrumb clicks jump to any level
- Browser history integration -- each drill-in pushes state, browser back button also pops a level
- After transition, auto-fit viewport to show all remaining cards centered
- Cards in subgraph show ALL rows, but irrelevant rows are dimmed (~40% opacity)
- Toggle in UI to hide dimmed rows for compact view (opt-in)
- Inspect panel replaces legend (CTRL-06 killed) and dimension toggles (CTRL-01, CTRL-02 killed)
- Magnifying glass icon in toolbar toggles a right-side inspect panel open/closed
- Inspect panel shows a collapsible, interactive tree breakdown of the authorization model
- At full graph: all types shown as root-level collapsible nodes
- In subgraph: tree re-roots to show current subgraph's root as the tree root
- Each tree node shows name + expression (e.g., `document#can_view: admin | editor | member`)
- Tree nodes are dimension-colored (matching edge colors from the graph)
- Clicking a tree node navigates into that node's subgraph; panel stays open and tree re-roots
- Hovering a tree node highlights the corresponding card/row on the canvas
- Filter input at top of panel for quick text search within the tree
- Panel overlays on top of the canvas (no canvas resize)
- Cmd+K opens center-screen overlay command palette with backdrop dim
- Fuzzy matching (like VS Code -- abbreviated input matches across the full name)
- Results grouped by type card (type name as group header)
- Each result shows row type icons (circle=relation, diamond=permission) + dimension color dot
- Selecting a result enters the subgraph for that node
- Shows last 5 recently visited nodes when opened with empty input
- Full keyboard navigation: arrow keys move selection, Enter confirms, Esc closes
- Search only -- no actions
- Double-click a card header to collapse it to header-only
- Collapse triggers ELK re-layout
- Per-card only -- no collapse-all / expand-all action
- Self-referencing dimensions show info icon with tooltip
- Linear-style minimal aesthetic with distinctive branded look
- Primary accent color: mustard (warm, distinctive)
- Floating pill-shaped toolbar centered at top of canvas
- Toolbar redesigned to match HUD aesthetic -- solid dark background, mustard accents, refined icons
- All new UI panels (inspect, command palette) use solid dark backgrounds (no glass transparency)
- ERD cards keep current dark glass styling unchanged
- Minimap and zoom controls restyled as HUD elements matching the dark solid aesthetic
- Canvas background: subtle dot grid pattern (like Figma/design tools)
- Breadcrumb in bottom-left corner
- Animations: smooth 300-400ms transitions with easing throughout
- Dot grid provides spatial reference on the canvas
- Code editor becomes a slide-out overlay panel from the left edge
- Editor overlays on top of the canvas (no canvas resize, HUD-consistent)
- Toggled via toolbar icon + keyboard shortcut (both)
- Open by default on page load

### Claude's Discretion
- Exact dot grid styling (opacity, spacing, color)
- Specific easing curves for animations
- Inspect panel width and internal spacing
- Command palette sizing and result density
- Minimap and controls exact positioning
- Keyboard shortcut for editor toggle (Cmd+E or similar)
- Collapse animation details
- How "hide dimmed rows" toggle is presented in the UI

### Deferred Ideas (OUT OF SCOPE)
- **Path tracing + access query** -- Combined feature for Phase 3. Both query-based (type a question to debug: "can user reach document#can_view?") and click-based. Shows authorization paths through the model. Includes PATH-01 (expression term highlighting) and PATH-02 (bridge indicators).
- **Dimension toggles** (CTRL-01, CTRL-02) -- Killed. Subgraph exploration covers the use case.
- **Type filtering** (CTRL-03) -- Killed. Subgraph exploration already filters to relevant types.
- **Permissions-only toggle** (CTRL-04) -- Killed. Card sections are clear enough; subgraph + row dimming handles focus.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INT-03 | Clicking a permission row enters upstream subgraph -- removes non-relevant cards and re-lays out | Subgraph navigation stack architecture; `traceUpstream()` already computes the exact node set; two-phase animation pattern |
| INT-04 | Clicking a card header enters downstream subgraph -- removes non-relevant cards and re-lays out | `traceDownstream()` already computes the exact node set; same navigation stack mechanism as INT-03 |
| INT-05 | Esc key or back button exits subgraph and returns to full graph | Browser History API (`pushState`/`popstate`) integration; navigation stack pop operation |
| INT-06 | Cards can be collapsed to header-only via double-click, triggering re-layout | `dblclick` handler on card header; toggle `collapsed` state per card; ELK re-layout with reduced card height |
| VIZ-09 | Subgraph enter/exit uses animated transitions (non-relevant cards fade, remaining animate to new positions) | Two-phase animation: opacity transition first (120ms), then CSS `transform` transition (300ms) on `.react-flow__node`; existing CSS transitions already handle position animation |
| PATH-03 | Self-referencing dimensions show info icon with tooltip | Detect self-referencing dimensions in graph data; render info icon + CSS tooltip on binding rows |
| CTRL-05 | Command palette (Cmd+K) searches types, relations, permissions with card/row navigation | Existing `CommandPalette.tsx` needs fuzzy search upgrade + subgraph navigation on select + recently visited tracking |
| CTRL-06 | Legend shows dimension color key + row type icons | **KILLED per CONTEXT.md** -- replaced by inspect panel. Requirement is superseded. |
| CTRL-01 | Dimension toggle chips in toolbar | **KILLED per CONTEXT.md** -- subgraph exploration covers the use case |
| CTRL-02 | Modifier+click on dimension chip for solo mode | **KILLED per CONTEXT.md** -- subgraph exploration covers the use case |
| CTRL-03 | Type filtering shows/hides entire cards | **KILLED per CONTEXT.md** -- subgraph exploration already filters to relevant types |
| CTRL-04 | Permissions-only toggle collapses relation sections on all cards | **KILLED per CONTEXT.md** -- card sections are clear enough |
| PATH-01 | Traced paths highlight specific expression terms in accent color | **DEFERRED to Phase 3** per CONTEXT.md |
| PATH-02 | Binding rows that enable TTU hops show bridge highlight indicator during trace | **DEFERRED to Phase 3** per CONTEXT.md |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@xyflow/react` | ^12.10.1 | Canvas, nodes, edges, `fitView`, `setNodes`/`setEdges` | Already in use; CSS transitions on `.react-flow__node` handle position animation |
| `zustand` | ^5.0.11 | Navigation stack state, collapsed cards state, inspect panel state | Already in use; extend `viewer-store` |
| `elkjs` | ^0.11.0 | Re-layout on subgraph enter/exit and card collapse | Already in use; existing `getLayoutedElements()` |
| `tailwindcss` | ^4.2.0 | HUD theming, panel styling | Already in use |

### Supporting (new)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `fuse.js` | ^7.0 | Fuzzy search for command palette (VS Code-style abbreviated matching) | Command palette search -- provides weighted scoring, threshold control, and match highlighting |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `fuse.js` | Custom `String.includes()` (current) | Current search works but lacks fuzzy/abbreviated matching ("dv" matching "document#can_view"). Fuse.js adds ~6KB gzipped but provides proper scoring. Acceptable tradeoff for the feature. |
| `fuse.js` | `microfuzz` (2KB) | Simpler but less configurable scoring. Fuse.js is the community standard. |
| `d3-timer` for animation | CSS transitions (current) | The project already has CSS `transform 300ms` transition on `.react-flow__node`. No need for JS-based tweening -- CSS handles it. |
| React Router | Raw History API | No router needed -- single page with stack-based navigation. `pushState`/`popstate` is sufficient. |

**Installation:**
```bash
npm install fuse.js
```

## Architecture Patterns

### Recommended Project Structure Changes
```
src/
├── canvas/
│   ├── FgaGraph.tsx          # Add subgraph transition orchestration
│   ├── fgaToFlow.ts          # Add row dimming + collapsed card support
│   ├── nodes/
│   │   └── TypeCardNode.tsx  # Add double-click collapse, click-to-navigate, row dimming
│   └── Breadcrumb.tsx        # NEW — breadcrumb trail component
├── inspect/                  # NEW — inspect panel (replaces legend/)
│   └── InspectPanel.tsx      # Tree view of authorization model
├── store/
│   ├── viewer-store.ts       # Add navigation stack, collapsed cards, inspect panel state
│   └── hover-store.ts        # Unchanged (hover highlighting stays as-is)
├── toolbar/
│   ├── Toolbar.tsx           # Redesign: mustard HUD, inspect toggle, kill legend/filter buttons
│   └── CommandPalette.tsx    # Upgrade: fuzzy search, grouped results, recently visited, subgraph navigation
├── theme/
│   └── colors.ts             # Update: mustard accent color, HUD palette
└── legend/
    └── LegendPanel.tsx       # DELETE — replaced by inspect panel
```

### Pattern 1: Navigation Stack State Machine
**What:** Subgraph exploration as a stack of navigation frames. Each frame records the entry point (row ID or card type ID), direction (upstream/downstream), and the computed visible node IDs.
**When to use:** Every subgraph drill-in/out operation.
**Example:**
```typescript
// In viewer-store.ts
interface NavigationFrame {
  /** The node ID that was clicked to enter this subgraph */
  entryNodeId: string;
  /** Direction of traversal */
  direction: 'upstream' | 'downstream';
  /** Display label for breadcrumb */
  label: string;
  /** Node IDs visible in this subgraph (type-level IDs for cards) */
  visibleTypeIds: Set<string>;
  /** Row IDs that are "relevant" (non-dimmed) in this subgraph */
  relevantRowIds: Set<string>;
}

interface ViewerStore {
  // ...existing fields...
  navigationStack: NavigationFrame[];
  collapsedCards: Set<string>;  // type names of collapsed cards
  inspectOpen: boolean;
  dimmedRowsHidden: boolean;    // toggle to hide dimmed rows
  recentlyVisited: string[];    // last 5 node IDs for command palette

  // Navigation actions
  navigateToSubgraph: (nodeId: string, direction: 'upstream' | 'downstream') => void;
  popSubgraph: () => void;
  jumpToLevel: (index: number) => void;

  // Card collapse
  toggleCardCollapse: (typeName: string) => void;
}
```

### Pattern 2: Two-Phase Animated Transition
**What:** Subgraph entry/exit uses a two-phase animation: (1) fade out non-relevant cards via opacity, (2) wait for fade, then compute new ELK layout and let CSS transition animate positions.
**When to use:** Every `navigateToSubgraph()` and `popSubgraph()` call.
**Example:**
```typescript
// Phase 1: Fade out non-relevant cards
// Set opacity to 0 on cards not in the target subgraph
setNodes((nodes) =>
  nodes.map((n) => ({
    ...n,
    style: {
      ...n.style,
      opacity: targetTypeIds.has(n.id) ? 1 : 0,
      transition: 'opacity 150ms ease-out',
    },
  }))
);

// Phase 2: After fade completes, remove hidden cards and re-layout
setTimeout(async () => {
  // Filter to only visible nodes
  const subgraphNodes = nodes.filter((n) => targetTypeIds.has(n.id));
  const subgraphEdges = edges.filter(
    (e) => targetTypeIds.has(e.source) && targetTypeIds.has(e.target)
  );

  // ELK re-layout (CSS transition on .react-flow__node handles position animation)
  const laid = await getLayoutedElements(subgraphNodes, subgraphEdges, direction);
  setNodes(laid.nodes);
  setEdges(laid.edges);

  // Auto-fit after layout animation completes
  setTimeout(() => {
    reactFlow.fitView({ duration: 200, padding: 0.08 });
  }, 350); // Wait for 300ms CSS transform transition
}, 180); // Wait for 150ms fade + buffer
```

### Pattern 3: Browser History Integration (No Router)
**What:** Each subgraph drill-in pushes state to the browser history. Browser back button pops the navigation stack.
**When to use:** Wrap `navigateToSubgraph()` and handle `popstate` events.
**Example:**
```typescript
// On drill-in
navigateToSubgraph: (nodeId, direction) => {
  // ...compute subgraph, push to navigation stack...
  window.history.pushState(
    { stackDepth: get().navigationStack.length },
    '',
  );
},

// In App.tsx or FgaGraph.tsx
useEffect(() => {
  const handlePopState = (e: PopStateEvent) => {
    const targetDepth = e.state?.stackDepth ?? 0;
    const currentDepth = useViewerStore.getState().navigationStack.length;
    if (targetDepth < currentDepth) {
      // User pressed back — pop to the target depth
      useViewerStore.getState().jumpToLevel(targetDepth);
    }
  };
  window.addEventListener('popstate', handlePopState);
  return () => window.removeEventListener('popstate', handlePopState);
}, []);
```

### Pattern 4: Inspect Panel Tree with Re-rooting
**What:** Collapsible tree view of the authorization model that re-roots when navigating into a subgraph. Tree nodes are interactive (click to navigate, hover to highlight).
**When to use:** Inspect panel component.
**Example:**
```typescript
// Build tree from AuthorizationGraph
interface TreeNode {
  id: string;           // AuthorizationNode ID
  label: string;        // display name
  expression?: string;  // transformed expression
  color?: string;       // dimension color
  section: 'binding' | 'relation' | 'permission';
  children: TreeNode[];
  expanded: boolean;
}

// At full graph: types are root nodes, relations/permissions are children
// In subgraph: re-root to the subgraph's entry node
function buildTree(
  graph: AuthorizationGraph,
  dimensions: Map<string, Dimension>,
  rootNodeId?: string,  // undefined = full graph
): TreeNode[] { ... }
```

### Pattern 5: Row Dimming in Subgraph
**What:** In a subgraph, all rows are shown but irrelevant rows get ~40% opacity. A toggle hides dimmed rows entirely.
**When to use:** `TypeCardNode` rendering when navigation stack is non-empty.
**Example:**
```typescript
// In TypeCardNode — determine row relevance from navigation stack
const currentFrame = navigationStack[navigationStack.length - 1];
const isRelevant = currentFrame
  ? currentFrame.relevantRowIds.has(row.id)
  : true; // All rows relevant at overview level

// Row opacity
const rowOpacity = isRelevant ? 1 : 0.4;

// If dimmedRowsHidden && !isRelevant, skip rendering the row entirely
if (dimmedRowsHidden && !isRelevant) return null;
```

### Anti-Patterns to Avoid
- **Animating with JS tween libraries when CSS works:** The project already has CSS `transform 300ms` on `.react-flow__node`. Do NOT add `d3-timer` or `framer-motion` for position tweening. CSS handles it.
- **Using React Router for navigation:** This is stack-based in-app navigation, not URL routing. Raw `pushState`/`popstate` is simpler and avoids a dependency.
- **Computing subgraphs in components:** Compute visible nodes/rows in the store action, not in render. The existing pattern of pre-computing highlight sets in `hover-store` should be followed.
- **Re-computing BFS on every render:** Store the computed `NavigationFrame` in the stack. Only recompute when the stack changes.
- **Mutating the Zustand store from within React Flow callbacks without `startTransition`:** The existing pattern wraps state updates in `startTransition` for focus mode changes. Subgraph navigation should do the same.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fuzzy search | Custom Levenshtein implementation | `fuse.js` | Scoring, threshold, weighted keys, match highlighting are deceptively complex. Fuse handles edge cases (diacritics, case, word boundaries). |
| CSS transitions | JS animation loop with `requestAnimationFrame` | CSS `transition` on `.react-flow__node` | Already in place. CSS transitions are GPU-accelerated and simpler. |
| Tooltip rendering | Custom positioned div with portal | CSS `:hover` + `::after` pseudo-element or title attribute | For the recursive hierarchy info icon, a CSS-only tooltip is sufficient. No tooltip library needed. |
| Tree view component | Custom recursive render with manual expand/collapse state | Simple recursive React component with local state | No tree library needed -- the authorization model tree is shallow (types > relations > permissions, max 3 levels). A 50-line recursive component suffices. |

**Key insight:** The existing codebase already solves the hardest problems. `traceUpstream()` and `traceDownstream()` compute subgraph node sets. CSS transitions animate positions. The store pattern handles derived state. This phase is primarily UI composition, not algorithm work.

## Common Pitfalls

### Pitfall 1: Edge Animation During Node Fade-Out
**What goes wrong:** During Phase 1 of the two-phase transition (fading out non-relevant cards), edges connected to fading cards remain visible, creating orphaned visual connections.
**Why it happens:** Edges are SVG paths, not DOM nodes. Their opacity is not automatically linked to their endpoint nodes.
**How to avoid:** During fade-out, set edge opacity to 0 simultaneously for any edge touching a non-relevant card. The existing `DimensionEdge` already reads opacity from data -- extend this to include the transition state.
**Warning signs:** Floating arrow lines pointing at nothing during subgraph transition.

### Pitfall 2: ELK Layout Cache Invalidation
**What goes wrong:** After removing cards for a subgraph, the ELK layout cache returns a stale result because the cache key hasn't changed enough.
**Why it happens:** The cache key in `elk-layout.ts` uses `${direction}|${nodeKeys}|${edgeKeys}`. If a subgraph produces the same node dimensions but different topology, the key could collide.
**How to avoid:** The current cache key includes all node IDs with dimensions AND all edge IDs, so topological changes WILL produce different keys. Verify this works correctly by testing with subgraphs that have the same cards but different edge sets.
**Warning signs:** Subgraph layout looks identical to full graph layout despite fewer cards.

### Pitfall 3: Browser History Stack Mismatch
**What goes wrong:** The `popstate` event fires but the navigation stack in Zustand is out of sync with the browser history stack.
**Why it happens:** If `popSubgraph()` calls `history.pushState` itself (creating a circular loop), or if the user rapidly clicks back/forward.
**How to avoid:** Only push to `history` on drill-in. On `popstate`, read the `stackDepth` from `event.state` and jump directly to that level in the Zustand stack. Never call `history.pushState/back/forward` from within the `popstate` handler.
**Warning signs:** Pressing back twice navigates forward, or pressing back has no effect.

### Pitfall 4: Zustand Re-render Storm from Navigation Stack
**What goes wrong:** Every component re-renders when `navigationStack` changes because `Object.is` comparison fails on arrays/objects.
**Why it happens:** Zustand's default equality check is `Object.is`. A new array reference is created on every stack operation.
**How to avoid:** Use individual selectors for derived primitives (e.g., `s.navigationStack.length`, `s.navigationStack[s.navigationStack.length - 1]?.entryNodeId`). For sets like `relevantRowIds`, keep them as stable `Set` references and select them individually. Follow the existing pattern from `hover-store` where `highlightedRowIds` is a stable `Set` reference.
**Warning signs:** Performance degradation when navigating into subgraphs; all cards re-render even if their visual state hasn't changed.

### Pitfall 5: Double-Click Conflict with Single Click
**What goes wrong:** Double-clicking a card header fires both `onClick` (subgraph navigation) and `onDoubleClick` (collapse).
**Why it happens:** Browsers fire `click` before `dblclick`. Without debouncing, the single-click handler runs first.
**How to avoid:** Use a 250ms delay on single-click actions (`onClick` on card header). If a second click arrives within that window, cancel the single-click and run the double-click handler. This is a classic UI pattern.
**Warning signs:** Double-clicking a header navigates into a subgraph AND collapses the card.

### Pitfall 6: Transition Timing Race Conditions
**What goes wrong:** The two-phase animation (fade + reposition) uses `setTimeout` for sequencing. If a user clicks rapidly (drill in, then immediately drill again), multiple transitions overlap, causing visual glitches.
**Why it happens:** `setTimeout` is fire-and-forget with no cancellation.
**How to avoid:** Track a `transitionId` (incrementing counter). Each transition checks if its ID is still current before proceeding to Phase 2. If not, it aborts. Also disable click handlers during transitions (150+300ms window).
**Warning signs:** Cards appear and disappear erratically during rapid navigation.

### Pitfall 7: Collapsed Card Height and ELK
**What goes wrong:** After collapsing a card, ELK lays out using the old card height, producing overlapping cards.
**Why it happens:** ELK uses `node.measured.width/height` from the React Flow node. If the card collapses but the measured dimensions aren't updated before layout runs, ELK gets stale dimensions.
**How to avoid:** After toggling collapse, wait for React to re-render the card (one `requestAnimationFrame`), THEN trigger ELK layout. This ensures `node.measured` reflects the new collapsed height.
**Warning signs:** Collapsed cards overlap with adjacent cards.

## Code Examples

### Subgraph Computation (Reusing Existing BFS)
```typescript
// upstream: click permission row → trace backward
import { traceUpstream } from '../graph/traversal';

function computeUpstreamSubgraph(
  rowId: string,
  edges: AuthorizationEdge[],
): { visibleTypeIds: Set<string>; relevantRowIds: Set<string> } {
  const { nodeIds } = traceUpstream(rowId, edges);

  // Extract type names from node IDs (e.g., "document#viewer" → "document")
  const visibleTypeIds = new Set<string>();
  const relevantRowIds = new Set<string>();

  for (const nodeId of nodeIds) {
    const hashIndex = nodeId.indexOf('#');
    if (hashIndex === -1) {
      visibleTypeIds.add(nodeId); // type-only node
    } else {
      visibleTypeIds.add(nodeId.substring(0, hashIndex));
      relevantRowIds.add(nodeId);
    }
  }

  return { visibleTypeIds, relevantRowIds };
}
```

### Command Palette with Fuse.js
```typescript
import Fuse from 'fuse.js';
import type { AuthorizationNode } from '../types';

// Build fuse instance (memoized on node changes)
const fuse = new Fuse(nodes, {
  keys: [
    { name: 'id', weight: 2 },       // "document#can_view" — primary match
    { name: 'type', weight: 1.5 },    // "document"
    { name: 'relation', weight: 1.5 },// "can_view"
    { name: 'definition', weight: 0.5 },
  ],
  threshold: 0.4,         // Allow fuzzy but not too loose
  includeScore: true,
  includeMatches: true,    // For highlighting matched chars
  minMatchCharLength: 2,
});

// Search
const results = query.trim()
  ? fuse.search(query).map(r => r.item)
  : recentlyVisited.map(id => nodeMap.get(id)).filter(Boolean);
```

### Breadcrumb Component
```typescript
// Breadcrumb trail in bottom-left corner
const Breadcrumb = () => {
  const stack = useViewerStore((s) => s.navigationStack);
  const jumpToLevel = useViewerStore((s) => s.jumpToLevel);

  if (stack.length === 0) return null;

  return (
    <div className="absolute bottom-4 left-3 z-40 flex items-center gap-1 text-xs">
      <button
        onClick={() => jumpToLevel(0)}
        className="hud-panel px-2 py-1 rounded-md cursor-pointer"
        style={{ color: blueprint.muted }}
      >
        Overview
      </button>
      {stack.map((frame, i) => (
        <Fragment key={i}>
          <span style={{ color: blueprint.muted }}>/</span>
          <button
            onClick={() => jumpToLevel(i + 1)}
            className="hud-panel px-2 py-1 rounded-md cursor-pointer"
            style={{
              color: i === stack.length - 1
                ? blueprint.accent
                : blueprint.muted
            }}
          >
            {frame.label}
          </button>
        </Fragment>
      ))}
    </div>
  );
};
```

### Editor as Overlay Panel
```typescript
// Editor becomes a floating overlay instead of a flex sibling
// In App.tsx — canvas takes full width, editor overlays
<div className="relative w-screen h-screen overflow-hidden">
  <Canvas />  {/* Full viewport */}
  <Toolbar />
  <EditorOverlay />     {/* Positioned absolute left, z-50 */}
  <InspectPanel />      {/* Positioned absolute right, z-50 */}
  <Breadcrumb />
  <CommandPalette />
</div>
```

### Card Collapse with Height Animation
```typescript
// In TypeCardNode — collapsed state
const collapsed = collapsedCards.has(d.typeName);

// Only render sections when not collapsed
return (
  <div className="rounded-xl overflow-hidden" style={cardStyle}>
    {/* Header — always visible */}
    <div
      className="px-3 py-1.5 text-sm font-semibold text-slate-100"
      onDoubleClick={() => toggleCardCollapse(d.typeName)}
      style={{ borderTop: `3px solid ${d.accentColor}`, cursor: 'pointer' }}
    >
      {d.typeName}
      {collapsed && (
        <span className="ml-1 text-xs" style={{ color: blueprint.muted }}>
          ({d.rows.length})
        </span>
      )}
    </div>

    {/* Sections — hidden when collapsed */}
    {!collapsed && sections.map((section) => (
      <div key={section.key} style={{ background: SECTION_BG[section.key] }}>
        {section.rows.map((row) => (
          <RowItem key={row.id} row={row} /* ...props */ />
        ))}
      </div>
    ))}
  </div>
);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JS-based position tweening (`d3-timer`, `popmotion`) | CSS `transition: transform` on `.react-flow__node` | React Flow v11+ | Simpler, GPU-accelerated, no extra dependency. Already in the project's `index.css`. |
| React Router for SPA navigation | Raw History API (`pushState`/`popstate`) | Always available | No router dependency for stack-based navigation. React Router is overkill for this use case. |
| Tree view libraries (`react-arborist`, `rc-tree`) | Custom recursive component | N/A | Authorization model trees are shallow (3 levels max). A custom component avoids a dependency and fits the HUD aesthetic. |
| `fuse.js` v6 CommonJS | `fuse.js` v7 ESM | 2024 | v7 is fully ESM, tree-shakeable, works with Vite without config. |

**Deprecated/outdated:**
- `react-flow-renderer` package: Renamed to `@xyflow/react` in v12. The project already uses the current package.
- `zustand` v4 `create()(...)` pattern: v5 uses `create<T>()((set, get) => ...)` which the project already follows.

## Open Questions

1. **Transition timing precision**
   - What we know: CSS `transition: transform 300ms` is already in `index.css`. Phase 1 fade uses `opacity 120ms`.
   - What's unclear: Whether the 150ms fade + 300ms reposition feels right or needs tuning. The CONTEXT.md says "300-400ms".
   - Recommendation: Start with 150ms fade, 300ms reposition, tune during implementation. The existing `cubic-bezier(0.4, 0, 0.2, 1)` easing (ease-out-quad) is a good default.

2. **Collapsed card measured height propagation to ELK**
   - What we know: ELK uses `node.measured.width/height`. React Flow updates `measured` after DOM render.
   - What's unclear: Whether `useNodesInitialized` re-fires after a card collapses (changing its measured height), which is needed to trigger re-layout.
   - Recommendation: If `useNodesInitialized` does not re-fire, manually trigger layout after a `requestAnimationFrame` following the collapse state change.

3. **Inspect panel tree building algorithm**
   - What we know: At overview, types are roots with their relations/permissions as children. In subgraph, the tree re-roots to the entry node.
   - What's unclear: For upstream subgraphs, the "root" is the permission that was clicked. The tree should show the permission as root with its upstream dependencies as children. This inverts the natural parent-child direction.
   - Recommendation: Build two tree modes -- "natural" (type > relation hierarchy) for overview, "dependency" (entry node > its upstream/downstream) for subgraphs. The dependency tree follows the BFS traversal order.

4. **HUD accent color migration**
   - What we know: Current accent is `#38bdf8` (sky blue). CONTEXT.md specifies mustard as primary accent.
   - What's unclear: Whether ALL existing accent usages switch to mustard or if some keep sky blue for contrast. The blueprint palette in `colors.ts` has `accent: "#38bdf8"`.
   - Recommendation: Replace `blueprint.accent` with mustard (`#d4a017` or similar warm amber). The sky blue color can remain as a secondary/info color if needed. This is a single-point-of-change in `colors.ts`.

## Sources

### Primary (HIGH confidence)
- `/xyflow/web` (Context7) -- React Flow fitView, setNodes/setEdges, node position animation approach, CSS transition pattern
- `/pmndrs/zustand` (Context7) -- persist middleware, URL state sync, custom storage patterns for browser history
- `/websites/fusejs_io` (Context7) -- Fuse.js configuration, weighted search, scoring theory

### Secondary (MEDIUM confidence)
- [React Flow Node Position Animation example](https://reactflow.dev/examples/nodes/node-position-animation) -- Confirms JS tweening approach exists but CSS transitions are simpler and already in use
- [React Flow Issue #685](https://github.com/wbkd/react-flow/issues/685) -- Community confirmation that CSS `transition: transform` works for position animation; caveat about edge SVG animation
- [MDN History API](https://developer.mozilla.org/en-US/docs/Web/API/History/pushState) -- `pushState`/`popstate` behavior confirmed: `popstate` fires on back/forward but NOT on `pushState` calls
- [Fuse.js documentation](https://www.fusejs.io/) -- v7 ESM support, scoring theory, weighted keys

### Tertiary (LOW confidence)
- None -- all findings verified with primary or secondary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- No new dependencies except `fuse.js`. Everything else is already installed and in use.
- Architecture: HIGH -- Navigation stack pattern is well-understood. Existing BFS traversal functions provide the subgraph computation. CSS transitions are already in the project's `index.css`.
- Pitfalls: HIGH -- Animation timing, double-click vs single-click, browser history sync, and Zustand re-render patterns are all well-documented in the React/React Flow ecosystem.

**Research date:** 2026-02-22
**Valid until:** 2026-03-22 (stable ecosystem, no fast-moving changes expected)
