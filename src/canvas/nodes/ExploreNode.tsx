import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { useHoverStore } from "../../store/hover-store";

/** React Flow node data for ExploreNode */
export interface ExploreNodeData {
  /** Relation name (e.g., "can_read", "admin") */
  relation: string;
  /** Type name (e.g., "client", "ip_agency") */
  typeName: string;
  /** Edge type label (direct, computed, ttu, tupleset) — omitted for root */
  edgeType?: string;
  /** Whether this is a terminal node */
  isTerminal: boolean;
  /** Whether this is the root (anchor) node */
  isRoot: boolean;
  /** Whether this is a permission (vs relation/role) */
  isPermission: boolean;
  /** Type restriction label for terminals (e.g., "as user", "via task#client") */
  typeRestriction?: string;
  [key: string]: unknown;
}

const hiddenHandle: React.CSSProperties = {
  opacity: 0,
  width: 6,
  height: 6,
};

function ExploreNodeComponent({ data, id }: NodeProps) {
  const d = data as ExploreNodeData;
  const dimmed = useHoverStore((s) => s.isHoverActive && !s.highlightedNodeIds.has(id));

  return (
    <div
      className="rounded-lg px-3 py-2 select-none"
      style={{
        background: d.isRoot
          ? "rgba(212, 160, 23, 0.08)"
          : d.isTerminal
            ? "var(--color-surface-raised)"
            : "var(--color-surface)",
        border: d.isRoot
          ? "2px solid var(--color-accent)"
          : d.isTerminal
            ? "1px solid var(--color-accent)"
            : "1px solid var(--color-border)",
        minWidth: 100,
        opacity: dimmed ? 0.25 : 1,
        transition: "border-color 150ms ease-out, opacity 150ms ease-out",
      }}
    >
      <Handle type="target" position={Position.Top} style={hiddenHandle} />

      {/* Relation name */}
      <div className="flex items-center gap-1.5">
        {d.isTerminal && !d.isRoot && (
          <span
            className="flex-shrink-0 rounded-full"
            style={{ width: 6, height: 6, background: "var(--color-accent)" }}
          />
        )}
        <span
          className="text-xs font-semibold"
          style={{ color: d.isRoot ? "var(--color-accent)" : "var(--color-text-primary)" }}
        >
          {d.relation}
        </span>
      </div>

      {/* Type name */}
      <div className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
        on {d.typeName}
      </div>

      {/* Type restriction on terminals */}
      {d.isTerminal && d.typeRestriction && (
        <div className="mt-0.5" style={{ color: "var(--color-text-muted)", fontSize: "0.6rem" }}>
          {d.typeRestriction}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} style={hiddenHandle} />
    </div>
  );
}

export const ExploreNode = memo(ExploreNodeComponent);
