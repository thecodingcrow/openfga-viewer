import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

/** React Flow node data for CompactTypeNode */
export interface CompactTypeData {
  label: string;
  isAnchorType: boolean;
  [key: string]: unknown;
}

/** Hidden handle style — exists for edge attachment only */
const hiddenHandle: React.CSSProperties = {
  opacity: 0,
  width: 6,
  height: 6,
};

function CompactTypeNodeComponent({ data }: NodeProps) {
  const d = data as CompactTypeData;

  return (
    <div
      className="rounded-lg px-4 py-2 text-sm font-semibold select-none cursor-pointer"
      style={{
        background: "var(--color-surface-raised)",
        color: "var(--color-text-primary)",
        border: d.isAnchorType
          ? "2px solid var(--color-accent)"
          : "1px solid var(--color-border)",
        minWidth: 80,
        textAlign: "center",
        transition: "border-color 150ms ease-out",
      }}
    >
      <Handle type="target" position={Position.Top} style={hiddenHandle} />
      <span>{d.label}</span>
      <Handle type="source" position={Position.Bottom} style={hiddenHandle} />
    </div>
  );
}

export const CompactTypeNode = memo(CompactTypeNodeComponent);
