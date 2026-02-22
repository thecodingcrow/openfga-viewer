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

