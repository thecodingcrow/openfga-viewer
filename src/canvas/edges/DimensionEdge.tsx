import { memo } from "react";
import {
  BaseEdge,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";
import type { EdgeClassification } from "../../types";
import type { Point } from "../../layout/elk-path";
import { elkPointsToPath } from "../../layout/elk-path";
import { TYPE_RESTRICTION_COLOR } from "../../theme/dimensions";
import { useHoverStore } from "../../store/hover-store";

/** Edge data passed via React Flow edge.data */
interface DimensionEdgeData {
  classification: EdgeClassification;
  dimensionColor?: string;
  elkRoute?: { points: Point[] };
  /** Opacity override for hover dimming (Plan 04) */
  opacity?: number;
  [key: string]: unknown;
}

/** Base stroke opacity — subtle, cards dominate (locked decision) */
const BASE_OPACITY = 0.6;

/** Stroke width — thin per locked decision ~1-1.5px */
const STROKE_WIDTH = 1.25;

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
  } = props;

  const d = data as DimensionEdgeData | undefined;

  // Hover state for dimming
  const isHoverActive = useHoverStore((s) => s.isHoverActive);
  const highlightedEdgeIds = useHoverStore((s) => s.highlightedEdgeIds);

  // Determine stroke color based on edge classification
  const strokeColor =
    d?.classification === "dimension"
      ? (d.dimensionColor ?? TYPE_RESTRICTION_COLOR)
      : TYPE_RESTRICTION_COLOR;

  // Determine opacity: dim non-highlighted edges when hover is active
  const opacity = isHoverActive
    ? highlightedEdgeIds.has(id) ? BASE_OPACITY : 0.08
    : BASE_OPACITY;

  // Build path: prefer ELK route when available, else fallback to smooth step
  let path: string;
  if (d?.elkRoute?.points && d.elkRoute.points.length >= 2) {
    path = elkPointsToPath(d.elkRoute.points);
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
  const strokeColor =
    d?.classification === "dimension"
      ? (d.dimensionColor ?? TYPE_RESTRICTION_COLOR)
      : TYPE_RESTRICTION_COLOR;

  return (
    <>
      <svg style={{ position: "absolute", width: 0, height: 0 }}>
        <defs>
          <marker
            id={`marker-${props.id}`}
            viewBox="0 0 8 8"
            refX={8}
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
