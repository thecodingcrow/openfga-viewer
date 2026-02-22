export const blueprint = {
  bg: "#0f1729",
  dotGrid: "#1e2d4a",
  nodeBg: "#1a2640",
  nodeBorder: "#2a3a5c",
  nodeHeader: "#7dd3fc",
  nodeBody: "#94a3b8",
  edgeStroke: "#4a6fa5",
  edgeArrow: "#5b8cc9",
  accent: "#38bdf8",
  surface: "#162033",
  surfaceBorder: "#253553",
  muted: "#64748b",
  danger: "#f87171",
} as const;

export const TYPE_PALETTE: Record<string, string> = {
  user:                  '#f59e0b',
  client:                '#3b82f6',
  category:              '#22c55e',
  intellectual_property: '#8b5cf6',
  task:                  '#06b6d4',
  ip_owner:              '#f97316',
  client_setting:        '#64748b',
  jurisdiction:          '#ec4899',
  ip_agency:             '#14b8a6',
  _default:              '#94a3b8',
};

const EXTRA_COLORS = [
  '#f59e0b', '#3b82f6', '#22c55e', '#8b5cf6', '#06b6d4',
  '#f97316', '#ec4899', '#14b8a6', '#a855f7', '#eab308',
];

function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function getTypeColor(typeName: string): string {
  return TYPE_PALETTE[typeName] ?? EXTRA_COLORS[hashString(typeName) % EXTRA_COLORS.length];
}

// Re-export dimension palette for convenient single-import access
export {
  DIMENSION_PALETTE,
  TYPE_RESTRICTION_COLOR,
  assignDimensionColors,
} from "./dimensions";
