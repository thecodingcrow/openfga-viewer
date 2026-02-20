import { memo } from 'react';
import { BaseEdge, type EdgeProps, getSmoothStepPath } from '@xyflow/react';
import { elkPointsToPath } from '../../layout/elk-path';
import type { ElkRoute } from '../../layout/elk-layout';

function DirectEdgeComponent(props: EdgeProps) {
  const elkRoute = (props.data as { elkRoute?: ElkRoute } | undefined)?.elkRoute;
  const path =
    elkRoute?.points && elkRoute.points.length >= 2
      ? elkPointsToPath(elkRoute.points)
      : getSmoothStepPath(props)[0];

  return (
    <BaseEdge
      path={path}
      style={{ stroke: '#94a3b8', strokeWidth: 1.5 }}
    />
  );
}

export const DirectEdge = memo(DirectEdgeComponent);
