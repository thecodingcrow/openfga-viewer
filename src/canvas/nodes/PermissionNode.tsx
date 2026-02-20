import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { TYPE_PALETTE } from '../../theme/colors';
import type { FgaNodeData } from '../fgaToFlow';

function PermissionNodeComponent({ data }: NodeProps) {
  const d = data as FgaNodeData;
  const color = TYPE_PALETTE[d.typeName] ?? TYPE_PALETTE._default;
  return (
    <div
      className="px-3 py-1.5 rounded-full text-sm"
      style={{
        background: 'rgba(30, 41, 59, 0.9)',
        border: `1px solid color-mix(in srgb, ${color} 50%, #34d399)`,
        color: '#34d399',
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-emerald-500 !w-1.5 !h-1.5" />
      <span className="opacity-60">{d.typeName}#</span>
      <span className="font-medium">{d.relation}</span>
      <Handle type="source" position={Position.Bottom} className="!bg-emerald-500 !w-1.5 !h-1.5" />
    </div>
  );
}

export const PermissionNode = memo(PermissionNodeComponent);
