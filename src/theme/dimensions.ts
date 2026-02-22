/**
 * Colorblind-safe dimension palette and color assignment.
 *
 * Uses Paul Tol's Muted qualitative palette (9 colors, verified colorblind-safe)
 * as the primary source. For >9 dimensions, generates additional colors via
 * OKLCH with golden angle hue distribution for maximum separation.
 */

import type { Dimension } from "../types";

// ─── Palette ────────────────────────────────────────────────────────────────

/**
 * Paul Tol's Muted qualitative palette — 9 colorblind-safe colors.
 * Source: https://personal.sron.nl/~pault/
 */
export const DIMENSION_PALETTE: readonly string[] = [
  "#CC6677", // rose
  "#332288", // indigo
  "#DDCC77", // sand
  "#117733", // green
  "#88CCEE", // cyan
  "#882255", // wine
  "#44AA99", // teal
  "#999933", // olive
  "#AA4499", // purple
] as const;

/** Muted slate for type-restriction (direct) edges — achromatic, distinct from dimension colors */
export const TYPE_RESTRICTION_COLOR = "#475569"; // slate-600

// ─── Color Assignment ───────────────────────────────────────────────────────

/**
 * Assign colors to detected dimensions.
 *
 * Sorts dimension names alphabetically for stable, deterministic assignment.
 * First 9 dimensions get Paul Tol Muted palette colors. Dimensions 10+
 * get programmatically generated OKLCH colors with golden angle hue spacing.
 *
 * Returns a NEW Map with color fields populated — does not mutate input.
 */
export function assignDimensionColors(
  dimensions: Map<string, Dimension>,
): Map<string, Dimension> {
  const sorted = [...dimensions.keys()].sort();
  const result = new Map<string, Dimension>();

  for (let i = 0; i < sorted.length; i++) {
    const name = sorted[i];
    const original = dimensions.get(name)!;

    const color =
      i < DIMENSION_PALETTE.length
        ? DIMENSION_PALETTE[i]
        : `oklch(0.7 0.15 ${(i * 137.5) % 360})`;

    result.set(name, {
      ...original,
      color,
      // Preserve Set references (spread doesn't clone Sets)
      bindingNodeIds: new Set(original.bindingNodeIds),
      edgeIds: new Set(original.edgeIds),
    });
  }

  return result;
}
