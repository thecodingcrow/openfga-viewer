import { memo } from "react";
import {
  BaseEdge,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";
import type { Point } from "../../layout/elk-path";
import { elkPointsToPath } from "../../layout/elk-path";
import { TYPE_RESTRICTION_COLOR } from "../../theme/dimensions";
import { useHoverStore } from "../../store/hover-store";

/** Edge data passed via React Flow edge.data */
interface DimensionEdgeData {
  color?: string;
  dimensionColor?: string;
  elkRoute?: { points: Point[] };
  [key: string]: unknown;
}

/** Base stroke opacity -- muted by default, vivid on hover */
const BASE_OPACITY = 0.35;

/** Stroke width -- medium weight per locked decision */
const STROKE_WIDTH = 1.5;

function getStrokeColor(data: DimensionEdgeData | undefined): string {
  return data?.color ?? data?.dimensionColor ?? TYPE_RESTRICTION_COLOR;
}

function DimensionEdgeComponent(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    style: edgeStyle,
  } = props;

  const d = data as DimensionEdgeData | undefined;

  // Hover state for dimming
  const isHoverActive = useHoverStore((s) => s.isHoverActive);
  const highlightedEdgeIds = useHoverStore((s) => s.highlightedEdgeIds);

  // Determine stroke color from edge data
  const strokeColor = getStrokeColor(d);

  // Determine opacity: style opacity takes precedence, otherwise use hover-based dimming
  const transitionOpacity = edgeStyle?.opacity;
  const hoverOpacity = isHoverActive
    ? highlightedEdgeIds.has(id) ? 1.0 : 0.15
    : BASE_OPACITY;

  const opacity = transitionOpacity != null ? transitionOpacity : hoverOpacity;

  // Build path: prefer ELK route when available, else fallback to smooth step.
  // When using elkRoute, snap first/last points to React Flow's handle positions
  // so edges connect to actual node boundaries regardless of dimension mismatches.
  let path: string;
  if (d?.elkRoute?.points && d.elkRoute.points.length >= 2) {
    const pts = d.elkRoute.points.map((p) => ({ ...p }));
    pts[0] = { x: sourceX, y: sourceY };
    pts[pts.length - 1] = { x: targetX, y: targetY };
    path = elkPointsToPath(pts);
  } else {
    [path] = getSmoothStepPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
    });
  }

  return (
    <BaseEdge
      id={id}
      path={path}
      style={{
        stroke: strokeColor,
        strokeWidth: STROKE_WIDTH,
        opacity,
        transition: edgeStyle?.transition as string | undefined,
      }}
      markerEnd={`url(#marker-${id})`}
      interactionWidth={10}
    />
  );
}

/**
 * Wrapper that includes an inline SVG marker definition per edge.
 * This ensures each edge gets an arrowhead matching its stroke color.
 */
function DimensionEdgeWithMarker(props: EdgeProps) {
  const d = props.data as DimensionEdgeData | undefined;
  const strokeColor = getStrokeColor(d);

  return (
    <>
      <svg style={{ position: "absolute", width: 0, height: 0 }}>
        <defs>
          <marker
            id={`marker-${props.id}`}
            viewBox="0 0 8 8"
            refX={6}
            refY={4}
            markerWidth={8}
            markerHeight={8}
            orient="auto-start-reverse"
          >
            <path
              d="M 0 0 L 8 4 L 0 8 Z"
              fill={strokeColor}
            />
          </marker>
        </defs>
      </svg>
      <DimensionEdgeComponent {...props} />
    </>
  );
}

export const DimensionEdge = memo(DimensionEdgeWithMarker);
