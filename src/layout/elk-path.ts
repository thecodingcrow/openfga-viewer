export interface Point {
  x: number;
  y: number;
}

/**
 * Converts an array of points to an SVG path string with rounded corners at bends.
 * Matches the smooth-step aesthetic of the original getSmoothStepPath.
 */
export function elkPointsToPath(
  points: Point[],
  cornerRadius = 8,
): string {
  if (points.length < 2) return '';

  const parts: string[] = [];
  parts.push(`M ${points[0].x} ${points[0].y}`);

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 1e-6) continue;

    const r = Math.min(cornerRadius, dist / 2);
    const hasNext = next && (next.x !== curr.x || next.y !== curr.y);

    if (hasNext && r > 0) {
      const nextDx = next.x - curr.x;
      const nextDy = next.y - curr.y;
      const nextDist = Math.sqrt(nextDx * nextDx + nextDy * nextDy);
      const nextR = Math.min(r, nextDist / 2);

      const inNormX = dx / dist;
      const inNormY = dy / dist;
      const outNormX = nextDx / nextDist;
      const outNormY = nextDy / nextDist;

      const beforeX = curr.x - inNormX * nextR;
      const beforeY = curr.y - inNormY * nextR;
      const afterX = curr.x + outNormX * nextR;
      const afterY = curr.y + outNormY * nextR;

      parts.push(`L ${beforeX} ${beforeY}`);
      parts.push(`Q ${curr.x} ${curr.y} ${afterX} ${afterY}`);
    } else {
      parts.push(`L ${curr.x} ${curr.y}`);
    }
  }

  return parts.join(' ');
}

/**
 * Returns the midpoint of a path for label placement.
 * Uses linear interpolation along the polyline.
 */
export function getPathMidpoint(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return { ...points[0] };

  let totalLength = 0;
  const segments: { start: Point; end: Point; length: number }[] = [];

  for (let i = 1; i < points.length; i++) {
    const start = points[i - 1];
    const end = points[i];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    totalLength += length;
    segments.push({ start, end, length });
  }

  const halfLength = totalLength / 2;
  let accumulated = 0;

  for (const seg of segments) {
    if (accumulated + seg.length >= halfLength) {
      const t = (halfLength - accumulated) / seg.length;
      return {
        x: seg.start.x + t * (seg.end.x - seg.start.x),
        y: seg.start.y + t * (seg.end.y - seg.start.y),
      };
    }
    accumulated += seg.length;
  }

  return { ...points[points.length - 1] };
}

/**
 * Returns the midpoint of a path with a perpendicular offset for label placement.
 * Offsets the label away from the path to avoid overlapping nodes.
 */
export function getPathMidpointWithOffset(
  points: Point[],
  offsetPx = 12,
): { x: number; y: number } | null {
  if (points.length < 2) return null;

  const mid = getPathMidpoint(points);

  let totalLength = 0;
  const segments: { start: Point; end: Point; length: number }[] = [];
  for (let i = 1; i < points.length; i++) {
    const start = points[i - 1];
    const end = points[i];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    totalLength += length;
    segments.push({ start, end, length });
  }

  const halfLength = totalLength / 2;
  let accumulated = 0;
  let tangentX = 0;
  let tangentY = 0;

  for (const seg of segments) {
    if (accumulated + seg.length >= halfLength) {
      const dx = seg.end.x - seg.start.x;
      const dy = seg.end.y - seg.start.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 1e-6) {
        tangentX = dx / len;
        tangentY = dy / len;
      }
      break;
    }
    accumulated += seg.length;
  }

  if (tangentX === 0 && tangentY === 0 && segments.length > 0) {
    const s = segments[0];
    const dx = s.end.x - s.start.x;
    const dy = s.end.y - s.start.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 1e-6) {
      tangentX = dx / len;
      tangentY = dy / len;
    }
  }

  const perpX = -tangentY;
  const perpY = tangentX;
  return {
    x: mid.x + offsetPx * perpX,
    y: mid.y + offsetPx * perpY,
  };
}

export interface NodeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Trims path endpoints to the handle positions (center of top/bottom edges).
 * Prevents path overshoot past node boundaries.
 */
export function trimPathToHandles(
  points: Point[],
  sourceBounds: NodeBounds,
  targetBounds: NodeBounds,
  direction: 'TB' | 'LR' = 'TB',
): Point[] {
  if (points.length < 2) return points;

  const sourceHandle = direction === 'TB'
    ? { x: sourceBounds.x + sourceBounds.width / 2, y: sourceBounds.y + sourceBounds.height }
    : { x: sourceBounds.x + sourceBounds.width, y: sourceBounds.y + sourceBounds.height / 2 };
  const targetHandle = direction === 'TB'
    ? { x: targetBounds.x + targetBounds.width / 2, y: targetBounds.y }
    : { x: targetBounds.x, y: targetBounds.y + targetBounds.height / 2 };

  const result = [...points];
  result[0] = { ...sourceHandle };
  result[result.length - 1] = { ...targetHandle };
  return result;
}
