import { memo } from 'react';
import { BaseEdge, type EdgeProps, getSmoothStepPath } from '@xyflow/react';
import { elkPointsToPath } from '../../layout/elk-path';
import type { ElkRoute } from '../../layout/elk-layout';
import { useEdgeInteraction } from './useEdgeInteraction';

function TuplesetDepEdgeComponent(props: EdgeProps) {
  const elkRoute = (props.data as { elkRoute?: ElkRoute } | undefined)?.elkRoute;
  const path =
    elkRoute?.points && elkRoute.points.length >= 2
      ? elkPointsToPath(elkRoute.points)
      : getSmoothStepPath(props)[0];

  const { stroke, strokeWidth, opacity, filter, zIndex } = useEdgeInteraction(
    props.id, props.source, props.target, 'tupleset-dep',
  );

  return (
    <BaseEdge
      path={path}
      markerEnd={props.markerEnd}
      interactionWidth={20}
      style={{ strokeDasharray: '2 4', stroke, strokeWidth, opacity, filter, zIndex }}
    />
  );
}

export const TuplesetDepEdge = memo(TuplesetDepEdgeComponent);
