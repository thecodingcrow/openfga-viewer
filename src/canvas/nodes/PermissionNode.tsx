import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { TYPE_PALETTE } from '../../theme/colors';
import type { FgaNodeData } from '../fgaToFlow';
import { useNodeInteraction } from './useNodeInteraction';

function PermissionNodeComponent({ id, data }: NodeProps) {
  const d = data as FgaNodeData;
  const color = TYPE_PALETTE[d.typeName] ?? TYPE_PALETTE._default;
  const { dimmed } = useNodeInteraction(id);

  return (
    <div
      className="px-3 py-1.5 rounded-full text-sm"
      style={{
        background: dimmed ? 'rgba(30, 41, 59, 0.25)' : 'rgba(30, 41, 59, 0.70)',
        border: `1px solid color-mix(in srgb, ${color} 50%, #34d399)`,
        borderColor: dimmed ? `color-mix(in srgb, ${color} 15%, transparent)` : undefined,
        color: '#34d399',
        transition: 'background 200ms ease, border-color 200ms ease, opacity 200ms ease',
        opacity: dimmed ? 0.3 : 1,
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-emerald-500 !w-1.5 !h-1.5" />
      {!d.hasParent && <span className="opacity-60">{d.typeName}#</span>}
      <span className="font-medium">{d.relation}</span>
      <Handle type="source" position={Position.Bottom} className="!bg-emerald-500 !w-1.5 !h-1.5" />
    </div>
  );
}

export const PermissionNode = memo(PermissionNodeComponent);
