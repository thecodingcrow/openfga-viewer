import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, type EdgeProps, getSmoothStepPath } from '@xyflow/react';
import { elkPointsToPath, getPathMidpointWithOffset } from '../../layout/elk-path';
import type { ElkRoute } from '../../layout/elk-layout';
import { useEdgeInteraction } from './useEdgeInteraction';

const LABEL_OFFSET_PX = 14;
const LOOP_PADDING = 50;
const LOOP_DY = 40;

function buildSelfLoopPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  nodeWidth = 150,
): { path: string; labelX: number; labelY: number } {
  const loopDx = nodeWidth / 2 + LOOP_PADDING;
  const path = `M ${sourceX} ${sourceY} C ${sourceX + loopDx} ${sourceY + LOOP_DY}, ${targetX + loopDx} ${targetY - LOOP_DY}, ${targetX} ${targetY}`;
  return {
    path,
    labelX: sourceX + loopDx + 24,
    labelY: (sourceY + targetY) / 2,
  };
}

function TtuEdgeComponent(props: EdgeProps) {
  const data = props.data as {
    tuplesetLabel?: string;
    elkRoute?: ElkRoute;
    sourceNodeWidth?: number;
  } | undefined;
  const elkRoute = data?.elkRoute;
  const tuplesetLabel = data?.tuplesetLabel;
  const isSelfLoop = props.source === props.target;

  const { stroke, strokeWidth, opacity, filter } = useEdgeInteraction(
    props.id, props.source, props.target, 'ttu',
  );

  let path: string;
  let labelX: number;
  let labelY: number;

  if (isSelfLoop) {
    const loop = buildSelfLoopPath(props.sourceX, props.sourceY, props.targetX, props.targetY, data?.sourceNodeWidth);
    path = loop.path;
    labelX = loop.labelX;
    labelY = loop.labelY;
  } else if (elkRoute?.points && elkRoute.points.length >= 2) {
    path = elkPointsToPath(elkRoute.points);
    const mid = getPathMidpointWithOffset(elkRoute.points, LABEL_OFFSET_PX);
    labelX = mid?.x ?? elkRoute.points[0].x;
    labelY = mid?.y ?? elkRoute.points[0].y;
  } else {
    const [p, lx, ly] = getSmoothStepPath(props);
    path = p;
    const dx = (props.targetX ?? 0) - (props.sourceX ?? 0);
    const dy = (props.targetY ?? 0) - (props.sourceY ?? 0);
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 1e-6) {
      const perpX = -dy / len;
      const perpY = dx / len;
      labelX = lx + LABEL_OFFSET_PX * perpX;
      labelY = ly + LABEL_OFFSET_PX * perpY;
    } else {
      labelX = lx;
      labelY = ly;
    }
  }

  return (
    <>
      <BaseEdge
        path={path}
        markerEnd={props.markerEnd}
        interactionWidth={20}
        style={{ stroke, strokeWidth, opacity, filter }}
      />
      {tuplesetLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'none',
              opacity,
              transition: 'opacity 180ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            className="nodrag nopan"
          >
            <div
              style={{
                fontSize: 9,
                color: '#7dd3fc',
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(56, 189, 248, 0.125)',
                borderRadius: 4,
                padding: '2px 6px',
                backdropFilter: 'blur(4px)',
                whiteSpace: 'nowrap',
              }}
            >
              {tuplesetLabel}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const TtuEdge = memo(TtuEdgeComponent);
