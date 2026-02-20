import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { TYPE_PALETTE } from '../../theme/colors';
import type { FgaNodeData } from '../fgaToFlow';

function RelationNodeComponent({ data }: NodeProps) {
  const d = data as FgaNodeData;
  const color = TYPE_PALETTE[d.typeName] ?? TYPE_PALETTE._default;
  return (
    <div
      className="px-3 py-1.5 rounded-md text-sm"
      style={{
        background: 'rgba(30, 41, 59, 0.8)',
        border: `1px solid ${color}40`,
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-500 !w-1.5 !h-1.5" />
      <span style={{ color: `${color}90` }}>{d.typeName}#</span>
      <span className="font-medium" style={{ color }}>{d.relation}</span>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-500 !w-1.5 !h-1.5" />
    </div>
  );
}

export const RelationNode = memo(RelationNodeComponent);
