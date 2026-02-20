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
  const segments: { id: string | null; label: string; title?: string; action: () => void }[] = [
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
        title: selectedNode.definition ?? undefined,
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
    focusMode === "path" && pathStart && pathEnd && tracedPaths
      ? `${pathStart} → ${pathEnd}`
      : null;

  const pathCount =
    tracedPaths !== null ? `${tracedPaths.length} path${tracedPaths.length !== 1 ? "s" : ""}` : null;

  return (
    <div
      className="fixed top-3 left-3 z-30 hud-panel flex items-center gap-3 px-3 py-1.5 text-xs max-w-[50vw]"
      style={{
        borderRadius: 8,
        color: blueprint.muted,
      }}
    >
      {/* Breadcrumb path */}
      <div className="flex items-center gap-1.5 truncate">
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
              title={seg.title}
              className="hover:underline cursor-pointer transition-colors truncate"
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

      {/* Path mode guidance */}
      {focusMode === "path" && !pathStart && (
        <>
          <span style={{ color: blueprint.nodeBorder }} aria-hidden>
            |
          </span>
          <span
            className="text-xs shrink-0"
            style={{ color: blueprint.accent }}
          >
            Select start node
          </span>
        </>
      )}
      {focusMode === "path" && pathStart && !pathEnd && (
        <>
          <span style={{ color: blueprint.nodeBorder }} aria-hidden>
            |
          </span>
          <span className="flex items-center gap-1 shrink-0">
            <span
              className="text-xs font-medium"
              style={{ color: blueprint.nodeHeader }}
            >
              {pathStart}
            </span>
            <span style={{ color: blueprint.muted }} className="text-xs">
              → select end node
            </span>
          </span>
        </>
      )}

      {/* Edge selection */}
      {edgeLabel && (
        <>
          <span style={{ color: blueprint.nodeBorder }} aria-hidden>
            |
          </span>
          <span className="flex items-center gap-1.5 shrink-0">
            <span style={{ color: blueprint.nodeBody }}>{edgeLabel}</span>
            <button
              type="button"
              onClick={() => selectEdge(null)}
              className="px-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
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
          <span className="flex items-center gap-1.5 shrink-0">
            <span style={{ color: blueprint.nodeBody }}>{pathLabel}</span>
            {pathCount && (
              <span style={{ color: blueprint.muted }}>({pathCount})</span>
            )}
            <button
              type="button"
              onClick={clearPath}
              className="px-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
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
