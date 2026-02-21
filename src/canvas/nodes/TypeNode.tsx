import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { TYPE_PALETTE } from '../../theme/colors';
import type { FgaNodeData } from '../fgaToFlow';
import { useNodeInteraction } from './useNodeInteraction';

function TypeNodeComponent({ id, data }: NodeProps) {
  const d = data as FgaNodeData;
  const color = TYPE_PALETTE[d.typeName] ?? TYPE_PALETTE._default;
  const { dimmed } = useNodeInteraction(id);

  if (d.isCompound) {
    return (
      <div
        className="rounded-lg w-full h-full"
        style={{
          border: `2px solid ${color}${dimmed ? '15' : '40'}`,
          background: dimmed ? 'rgba(15, 23, 42, 0.25)' : 'rgba(15, 23, 42, 0.6)',
          transition: 'background 200ms ease, border-color 200ms ease, opacity 200ms ease',
          opacity: dimmed ? 0.35 : 1,
        }}
      >
        <Handle type="target" position={Position.Top} className="!bg-slate-500 !w-2 !h-2" />
        <div
          className="px-3 py-1.5 text-sm font-medium border-b"
          style={{ color, borderColor: `${color}20` }}
        >
          {d.typeName}
        </div>
        <Handle type="source" position={Position.Bottom} className="!bg-slate-500 !w-2 !h-2" />
      </div>
    );
  }

  return (
    <div
      className="px-4 py-2.5 rounded-lg font-medium min-w-[80px] text-center"
      style={{
        background: dimmed ? 'rgba(30, 41, 59, 0.25)' : 'rgba(30, 41, 59, 0.9)',
        border: `2px solid ${color}${dimmed ? '20' : '60'}`,
        color: color,
        transition: 'background 200ms ease, border-color 200ms ease, opacity 200ms ease',
        opacity: dimmed ? 0.35 : 1,
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-500 !w-2 !h-2" />
      {d.typeName}
      <Handle type="source" position={Position.Bottom} className="!bg-slate-500 !w-2 !h-2" />
    </div>
  );
}

export const TypeNode = memo(TypeNodeComponent);
