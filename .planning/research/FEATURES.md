# Feature Research

**Domain:** Compound graph visualization for authorization model exploration (OpenFGA)
**Researched:** 2026-02-21
**Confidence:** MEDIUM (based on competitor analysis, graph visualization UX research, and existing codebase audit; no direct user feedback)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Readable compound layout** | Every graph tool produces untangled layouts. Users won't debug spaghetti. | HIGH | Current 3-pass ELK system is broken. This is the #1 blocker. Relations-top/permissions-bottom ordering matches the mental model of access flowing downward through types. |
| **Pan, zoom, fit-to-view** | Standard canvas gestures (pinch-zoom, scroll-pan, double-click-fit). Every React Flow app ships this. | LOW | Already works via React Flow built-ins. `fitView` on layout complete is implemented. |
| **Minimap** | Every graph tool with >10 nodes needs a minimap for orientation. React Flow ships `<MiniMap>`. | LOW | Not currently rendered. One-liner to add. Should color nodes by type for wayfinding. |
| **Controls panel** | Zoom-in, zoom-out, fit-view, lock-interaction buttons. React Flow ships `<Controls>`. | LOW | Not currently rendered. One-liner to add. |
| **Node hover highlights** | Hovering a node should visually distinguish its connected edges and neighbors. Standard in Cytoscape, yFiles, Neo4j Bloom, every graph tool. | MEDIUM | Partially exists. `useHoverStore` + `expandViaTtu()` BFS computes the highlight set. Edge/node components need to consume hover state and dim non-highlighted elements. |
| **Type filtering** | Show/hide specific types to reduce visual noise. Expected in any domain graph viewer. | LOW | `applyFilters` and store infrastructure exist. Toolbar UI for type checkboxes needs implementation. |
| **Permissions-only filter** | Toggle to hide relation internals and show only the permission surface. Authorization users think in permissions first. | LOW | `permissionsOnly` filter exists in store and `applyFilters`. Needs a toolbar toggle. |
| **Layout direction toggle (TB/LR)** | Users expect to switch between top-to-bottom and left-to-right depending on model shape. Standard in ELK-based tools. | MEDIUM | Store has `layoutDirection`. UI toggle exists but layout results are broken. Depends on layout fix. |
| **Edge visual distinction** | Different edge types (direct, computed, tupleset-dep) must be visually distinguishable via color, dash pattern, or animation. | LOW | Edge types exist with distinct colors/markers. May need refinement once layout is fixed. |
| **DSL editor with syntax highlighting** | Users need to see and edit the FGA model alongside the graph. CodeMirror + FGA grammar is the standard. | LOW | Already implemented. CodeMirror 6 with Lezer grammar, 300ms debounce parse. |
| **Legend** | Users need to decode what colors, edge styles, and node shapes mean. | LOW | Already implemented (`src/legend/`). May need updates as visual language evolves. |
| **Cross-compound edge distinction** | Edges crossing compound boundaries must look different from internal edges. Otherwise users can't tell local vs. external dependencies. | MEDIUM | Not implemented. Needs logic in `toFlowEdge` or edge components to detect cross-type edges and apply distinct styling (dashed, different color, or label). |

### Differentiators (Competitive Advantage)

Features that set the product apart. The OpenFGA Playground is basic (100 tuple limit, flat graph, no exploration). OpenFGA Studio is store-management focused. Neither offers deep graph exploration. This is where we compete.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Focus mode (neighborhood exploration)** | Click a node to see its k-hop neighborhood. Reduces graph to what's relevant. Neither the FGA Playground nor OpenFGA Studio offers this. Graph exploration tools like Neo4j Bloom have this but not in the authz model space. | MEDIUM | `computeNeighborhood()` exists. `selectNode` toggles focus mode. Needs: animated transition between overview and focused state, breadcrumb showing current focus context, adjustable hop radius in UI. |
| **Directional path tracing** | "Where does this permission come from?" (upstream) and "What does this relation enable?" (downstream). Answers the core question authorization engineers ask. No existing OpenFGA tool does this visually. | HIGH | `findPaths()` and `collectPathElements()` exist but trace bidirectionally. Need directional variants: upstream-only (follow edges backward from permissions) and downstream-only (follow edges forward from relations). Path highlighting needs visual treatment (glow, thicken, animate). |
| **TTU-aware hover expansion** | Hovering a node reveals its full authorization chain including tupleToUserset connections. TTU is the hardest FGA concept; making it visually explorable is a genuine differentiator. | MEDIUM | `expandViaTtu()` BFS already works. Hover store is separate (good for perf). Needs visual treatment: expanded TTU neighbors get a subtle glow or connection indicator, possibly with tooltip explaining the TTU relationship. |
| **Compound expand/collapse** | Collapse a type node to hide its internals, showing only its external edges. Lets users manage complexity of large models (10+ types). Standard in yFiles and Cytoscape compound extensions, but not in any OpenFGA tool. | HIGH | Not implemented. Requires: tracking collapsed state per compound, re-running layout with collapsed nodes as simple nodes, preserving cross-compound edges, animating the transition. ELK supports hierarchical layout which helps, but the current 3-pass system would need adaptation. |
| **Command palette search (Cmd+K)** | Quick search and navigation: find nodes by name, jump to type, trigger actions. Power-user feature that makes large models navigable. | MEDIUM | `CommandPalette.tsx` exists in toolbar. Needs: index of all nodes, fuzzy search, action dispatch (focus node, trace path to node, filter to type). |
| **Semantic zoom (level of detail)** | At low zoom: show only type nodes as boxes. At medium zoom: show relation/permission names. At high zoom: show full definitions. Prevents information overload at overview scale. Research supports this for compound graphs (arxiv:2408.04045). | HIGH | Not implemented. Requires: zoom-level-aware rendering in node components, possibly hiding/showing node content based on `useStore(s => s.transform)` viewport zoom. Could be phased: start with hiding definitions at low zoom. |
| **URL-shareable state** | Encode current view state (filters, focus, layout direction, possibly base64 DSL) in URL hash. Lets users share specific views of their model. Neither FGA Playground nor Studio supports this. | MEDIUM | Not implemented. Requires: URL hash encoding/decoding of relevant store slices. No backend needed since the tool is client-only. |
| **Export (SVG/PNG)** | Export current graph view as image. Standard in Gephi, Neo4j, every visualization tool. Needed for documentation, presentations, architecture reviews. | MEDIUM | Not implemented. React Flow's `toObject()` + html-to-image or svg serialization. Several React Flow community examples exist. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems for this specific tool.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Real-time collaboration** | "Multiple engineers reviewing the model together" | Massive complexity (CRDT/OT, conflict resolution, cursor sync). This is a single-user exploration tool, not a collaborative editor. The DSL source lives in version control. | URL-shareable state lets users share views. Copy-paste DSL into the editor. |
| **Tuple/data management** | "I want to add tuples and test checks" | Conflates model visualization with runtime testing. The Playground already does this (poorly). Mixing data operations with model exploration creates UI bloat and confused mental models. | Stay focused on model structure visualization. Link out to Playground/CLI for tuple testing. |
| **Backend/API integration** | "Connect to my running OpenFGA instance" | Adds deployment complexity, auth concerns, network latency. Breaks the "paste and explore" simplicity. | File import (already exists), URL import of .fga files, copy-paste from CLI output. |
| **Graph editing (visual model authoring)** | "Let me drag nodes to create relations" | Visual graph editing is a fundamentally different UX from visualization. Dual-mode tools (view+edit) are always worse at both. The DSL is the source of truth. | Bidirectional sync: clicks in graph highlight corresponding DSL in editor. Editor is the authoring surface. |
| **Mobile/touch support** | "Use on iPad during meetings" | Touch interaction conflicts with pan/zoom gestures. Node targets are too small. Compound graphs need hover states. Responsive layout for complex graphs is unsolved. | Desktop-only with good export. Users can share PNGs/SVGs for mobile viewing. |
| **Full accessibility (a11y)** | "Screen reader support for graph" | Graph visualization is inherently visual. Full a11y for compound graphs is a research problem, not an engineering task. | Keyboard navigation for node selection. Text-based model summary as alternative view. Defer full a11y to a dedicated milestone. |
| **Undo/redo for exploration** | "Go back to my previous view" | Branching history for exploration state (filters, focus, zoom, selection) is complex and rarely useful in practice. Users don't think in "undo my filter change." | Browser back/forward if URL state is implemented. Reset-to-overview button. Clear filters button. |
| **Natural language search** | "Show me who can edit documents" | Requires NLP/LLM integration, is inherently unreliable, and the FGA DSL is already precise. Over-engineering for a developer tool. | Structured search via command palette: search by node name, type, relation name. Fast and deterministic. |

## Feature Dependencies

```
[Readable compound layout]
    +--requires--> [ELK layout fix]
    +--enables--> [Layout direction toggle]
    +--enables--> [Cross-compound edge distinction]
    +--enables--> [Compound expand/collapse]
    +--enables--> [Export SVG/PNG]

[Node hover highlights]
    +--requires--> [Edge visual distinction]
    +--enhances--> [TTU-aware hover expansion]

[Type filtering]
    +--enhances--> [Focus mode]
    +--enhances--> [Permissions-only filter]

[Focus mode (neighborhood)]
    +--requires--> [Readable compound layout]
    +--enhances--> [Directional path tracing]
    +--enhances--> [Command palette search]

[Directional path tracing]
    +--requires--> [Readable compound layout]
    +--requires--> [Edge visual distinction]
    +--enhances--> [TTU-aware hover expansion]

[Semantic zoom]
    +--requires--> [Readable compound layout]
    +--conflicts--> [Compound expand/collapse] (both manage information density; pick one first)

[URL-shareable state]
    +--enhances--> [Type filtering]
    +--enhances--> [Focus mode]
    +--enhances--> [Layout direction toggle]

[Command palette search]
    +--enhances--> [Focus mode]
    +--enhances--> [Directional path tracing]
```

### Dependency Notes

- **Layout is foundational**: Every visual feature depends on readable compound layout. It must be phase 1.
- **Edge distinction enables exploration**: Hover highlights and path tracing both need edges that are visually distinguishable. Edge styling should be solidified before exploration features.
- **Semantic zoom conflicts with expand/collapse**: Both reduce information density but via different mechanisms. Building both creates UX confusion ("do I zoom out or collapse?"). Recommend expand/collapse first (more intuitive, standard in compound graph tools) and semantic zoom later if needed.
- **URL state is a force multiplier**: Once filters, focus mode, and direction work, URL state makes them shareable. It's low complexity but high value, best added after the features it encodes are stable.

## MVP Definition

### Launch With (v1)

Minimum viable product -- what's needed for the tool to be useful for authorization model exploration.

- [ ] **Readable compound layout** -- without this, nothing else matters
- [ ] **Minimap + Controls** -- one-liner additions, expected by every user
- [ ] **Node hover highlights** -- makes the graph interactive, not just a picture
- [ ] **Type filtering + permissions-only toggle** -- infrastructure exists, needs UI
- [ ] **Edge visual distinction** -- already partially done, needs refinement
- [ ] **Cross-compound edge distinction** -- needed to understand inter-type relationships
- [ ] **Layout direction toggle** -- depends on layout fix, but minimal additional work

### Add After Validation (v1.x)

Features to add once core layout and filtering are solid.

- [ ] **Focus mode (neighborhood)** -- when users have models with >5 types and need to zoom into a section
- [ ] **Directional path tracing** -- when users ask "how does user get can_edit on document?"
- [ ] **TTU-aware hover expansion** -- when TTU relations confuse users (they will)
- [ ] **Command palette search** -- when models get large enough that scrolling/panning is slow
- [ ] **Export SVG/PNG** -- when users need to share graph views in docs/presentations

### Future Consideration (v2+)

Features to defer until the core exploration experience is validated.

- [ ] **Compound expand/collapse** -- complex implementation, only needed for very large models (10+ types)
- [ ] **Semantic zoom** -- research-grade feature, valuable but high complexity
- [ ] **URL-shareable state** -- valuable but depends on all encoded features being stable first

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Readable compound layout | HIGH | HIGH | P1 |
| Minimap + Controls | MEDIUM | LOW | P1 |
| Node hover highlights | HIGH | MEDIUM | P1 |
| Type filtering UI | HIGH | LOW | P1 |
| Permissions-only toggle | MEDIUM | LOW | P1 |
| Edge visual distinction | HIGH | LOW | P1 |
| Cross-compound edge distinction | HIGH | MEDIUM | P1 |
| Layout direction toggle | MEDIUM | LOW | P1 |
| Focus mode (neighborhood) | HIGH | MEDIUM | P2 |
| Directional path tracing | HIGH | HIGH | P2 |
| TTU-aware hover expansion | MEDIUM | MEDIUM | P2 |
| Command palette search | MEDIUM | MEDIUM | P2 |
| Export SVG/PNG | MEDIUM | MEDIUM | P2 |
| Compound expand/collapse | MEDIUM | HIGH | P3 |
| Semantic zoom | LOW | HIGH | P3 |
| URL-shareable state | MEDIUM | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch -- layout, basic interaction, filtering
- P2: Should have, add when possible -- exploration features that differentiate
- P3: Nice to have, future consideration -- advanced features for large models

## Competitor Feature Analysis

| Feature | OpenFGA Playground | OpenFGA Studio | Auth0 FGA Playground | **Our Approach** |
|---------|-------------------|----------------|---------------------|-----------------|
| Model graph visualization | Basic flat graph, no compound nodes | Interactive graph, dynamic updates | Basic model preview | Compound nodes with ELK hierarchical layout |
| Filtering | None | None documented | None | Type filter + permissions-only toggle |
| Focus/neighborhood | None | Node exploration (basic) | None | k-hop neighborhood with animated transitions |
| Path tracing | None | None | Tuple query visualization | Directional path tracing (upstream/downstream) |
| Search | None | None documented | None | Command palette with fuzzy search |
| Hover interaction | None documented | None documented | None | TTU-aware expansion with visual highlighting |
| Export | None | None documented | None | SVG/PNG export |
| DSL editor | JSON only | Visual editor with validation | JSON + DSL | CodeMirror with Lezer FGA grammar |
| Expand/collapse | None | None | None | Compound expand/collapse (future) |
| Tuple management | Yes (100 tuple limit) | Yes (advanced) | Yes | **Deliberately excluded** -- stay focused on model viz |
| API integration | Local only | Yes (store management) | Cloud-connected | **Deliberately excluded** -- paste and explore |

### Competitive Position

The OpenFGA ecosystem has **no dedicated model exploration tool**. The Playground is a prototyping scratchpad (100 tuple limit, flat graph). OpenFGA Studio is a store management tool that happens to have a graph view. Auth0 FGA Playground is cloud-tied and limited.

Our differentiator is **deep graph exploration** of the authorization model structure itself: compound layout, path tracing, focus mode, TTU visualization. We don't compete on tuple management or API integration -- we compete on making the model readable and explorable.

## Sources

- [React Flow documentation](https://reactflow.dev/) - Built-in components (MiniMap, Controls, sub-flows), compound node support (HIGH confidence)
- [Cytoscape.js expand-collapse extension](https://github.com/iVis-at-Bilkent/cytoscape.js-expand-collapse) - Compound graph interaction patterns (HIGH confidence)
- [yFiles features](https://www.yfiles.com/the-yfiles-sdk/features/visualization) - Professional graph viz feature expectations (HIGH confidence)
- [Cambridge Intelligence: Graph Visualization UX](https://cambridge-intelligence.com/graph-visualization-ux-how-to-avoid-wrecking-your-graph-visualization/) - UX patterns and anti-patterns for graph tools (MEDIUM confidence)
- [An Overview+Detail Layout for Compound Graphs (arxiv:2408.04045)](https://arxiv.org/html/2408.04045v1) - Academic research on semantic zoom and compound graph layout (HIGH confidence)
- [OpenFGA Playground docs](https://openfga.dev/docs/getting-started/setup-openfga/playground) - Competitor feature set (HIGH confidence)
- [OpenFGA Studio](https://github.com/prakashm88/openfga-studio) - Competitor feature set (MEDIUM confidence)
- [Neo4j Bloom](https://neo4j.com/product/bloom/) - Graph exploration feature expectations (perspectives, search) (MEDIUM confidence)
- [ELK layout reference](https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-layered.html) - Compound graph layout capabilities (HIGH confidence)
- Existing codebase audit: `src/graph/traversal.ts`, `src/store/viewer-store.ts`, `src/canvas/fgaToFlow.ts`, `src/canvas/FgaGraph.tsx` (HIGH confidence)

---
*Feature research for: Compound graph visualization for authorization model exploration*
*Researched: 2026-02-21*
