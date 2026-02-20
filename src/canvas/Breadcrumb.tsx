import { useViewerStore } from "../store/viewer-store";
import { blueprint } from "../theme/colors";

export function Breadcrumb() {
  const nodes = useViewerStore((s) => s.nodes);
  const edges = useViewerStore((s) => s.edges);
  const focusMode = useViewerStore((s) => s.focusMode);
  const selectedNodeId = useViewerStore((s) => s.selectedNodeId);
  const selectedEdgeId = useViewerStore((s) => s.selectedEdgeId);
  const pathStart = useViewerStore((s) => s.pathStart);
  const pathEnd = useViewerStore((s) => s.pathEnd);
  const tracedPaths = useViewerStore((s) => s.tracedPaths);
  const setFocusMode = useViewerStore((s) => s.setFocusMode);
  const selectNode = useViewerStore((s) => s.selectNode);
  const selectEdge = useViewerStore((s) => s.selectEdge);
  const clearPath = useViewerStore((s) => s.clearPath);

  const selectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId)
    : null;

  const selectedEdge = selectedEdgeId
    ? edges.find((e) => e.id === selectedEdgeId)
    : null;

  // ── Breadcrumb segments ──
  const segments: { id: string | null; label: string; action: () => void }[] = [
    { id: null, label: "All types", action: () => setFocusMode("overview") },
  ];

  if (selectedNode) {
    segments.push({
      id: selectedNode.type,
      label: selectedNode.type,
      action: () => {
        const typeNode = nodes.find(
          (n) => n.kind === "type" && n.type === selectedNode.type,
        );
        if (typeNode) selectNode(typeNode.id);
      },
    });
    if (selectedNode.relation) {
      segments.push({
        id: selectedNode.id,
        label: selectedNode.relation,
        action: () => selectNode(selectedNode.id),
      });
    }
  }

  // ── Edge info ──
  const edgeLabel =
    selectedEdge?.rewriteRule === "ttu"
      ? `TTU via ${selectedEdge.tuplesetRelation ?? ""}`
      : selectedEdge?.rewriteRule === "computed"
        ? "Computed userset"
        : selectedEdge?.rewriteRule === "direct"
          ? "Direct type restriction"
          : null;

  // ── Path info ──
  const pathLabel =
    focusMode === "path" && pathStart && pathEnd
      ? `Path: ${pathStart} → ${pathEnd}`
      : null;

  const pathCount =
    tracedPaths !== null ? `${tracedPaths.length} path(s) found` : null;

  return (
    <div
      className="flex items-center gap-4 px-3 py-2 shrink-0 text-xs"
      style={{
        background: blueprint.surface,
        borderBottom: `1px solid ${blueprint.nodeBorder}`,
        color: blueprint.muted,
      }}
    >
      {/* Breadcrumb path */}
      <div className="flex items-center gap-1.5">
        {segments.map((seg, i) => (
          <span key={seg.id ?? "root"} className="flex items-center gap-1.5">
            {i > 0 && (
              <span style={{ color: blueprint.nodeBorder }} aria-hidden>
                ›
              </span>
            )}
            <button
              type="button"
              onClick={seg.action}
              className="hover:underline cursor-pointer transition-colors"
              style={{
                color:
                  i === segments.length - 1
                    ? blueprint.nodeHeader
                    : blueprint.muted,
              }}
            >
              {seg.label}
            </button>
          </span>
        ))}
      </div>

      {/* Focus mode badge */}
      {focusMode !== "overview" && (
        <>
          <span style={{ color: blueprint.nodeBorder }} aria-hidden>
            |
          </span>
          <span
            className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-medium"
            style={{
              color: blueprint.accent,
              background: `${blueprint.accent}15`,
            }}
          >
            {focusMode}
          </span>
        </>
      )}

      {/* Definition tooltip */}
      {selectedNode?.definition && (
        <>
          <span style={{ color: blueprint.nodeBorder }} aria-hidden>
            |
          </span>
          <span style={{ color: blueprint.nodeBody }}>
            {selectedNode.definition}
          </span>
        </>
      )}

      {/* Edge selection */}
      {edgeLabel && (
        <>
          <span style={{ color: blueprint.nodeBorder }} aria-hidden>
            |
          </span>
          <span className="flex items-center gap-1.5">
            <span style={{ color: blueprint.muted }}>Edge:</span>
            <span style={{ color: blueprint.nodeBody }}>{edgeLabel}</span>
            <button
              type="button"
              onClick={() => selectEdge(null)}
              className="ml-1 px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors cursor-pointer"
              style={{ color: blueprint.muted }}
              title="Clear selection"
            >
              ×
            </button>
          </span>
        </>
      )}

      {/* Path tracing info */}
      {pathLabel && (
        <>
          <span style={{ color: blueprint.nodeBorder }} aria-hidden>
            |
          </span>
          <span className="flex items-center gap-1.5">
            <span style={{ color: blueprint.nodeBody }}>{pathLabel}</span>
            {pathCount && (
              <span style={{ color: blueprint.muted }}>({pathCount})</span>
            )}
            <button
              type="button"
              onClick={clearPath}
              className="ml-1 px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors cursor-pointer"
              style={{ color: blueprint.muted }}
              title="Clear path"
            >
              ×
            </button>
          </span>
        </>
      )}
    </div>
  );
}
