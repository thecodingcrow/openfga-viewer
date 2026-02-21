import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { TYPE_PALETTE } from '../../theme/colors';
import type { FgaNodeData } from '../fgaToFlow';
import { useNodeInteraction } from './useNodeInteraction';

function RelationNodeComponent({ id, data }: NodeProps) {
  const d = data as FgaNodeData;
  const color = TYPE_PALETTE[d.typeName] ?? TYPE_PALETTE._default;
  const { dimmed } = useNodeInteraction(id);
  const isBinding = d.isTuplesetBinding;

  return (
    <div
      className="px-3 py-1.5 rounded-md text-sm"
      style={{
        background: dimmed
          ? 'rgba(30, 41, 59, 0.20)'
          : isBinding
            ? 'rgba(30, 41, 59, 0.40)'
            : 'rgba(30, 41, 59, 0.65)',
        border: `1px ${isBinding ? 'dashed' : 'solid'} ${color}${dimmed ? '10' : '40'}`,
        transition: 'background 200ms ease, border-color 200ms ease, opacity 200ms ease',
        opacity: dimmed ? 0.3 : 1,
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-500 !w-1.5 !h-1.5" />
      {!d.hasParent && <span style={{ color: `${color}90` }}>{d.typeName}#</span>}
      <span className="font-medium" style={{ color }}>{d.relation}</span>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-500 !w-1.5 !h-1.5" />
    </div>
  );
}

export const RelationNode = memo(RelationNodeComponent);
