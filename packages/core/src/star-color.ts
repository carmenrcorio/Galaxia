/**
 * Curated constellation star colors + single resolution point for node paint.
 *
 * `people.star_color` stores a palette hex, or NULL to keep the existing
 * element-from-relation (gold for self) behavior. Resolution is one function —
 * callers must not re-branch per draw call.
 */

import { elementFromRelation } from "./galaxy-orbit";

/** Element / self colours already used on the galaxy canvas (EL_COLOR). */
export const ELEMENT_NODE_COLORS = {
  fire: "#E0825C",
  earth: "#cdbd7a",
  air: "#B79AD8",
  water: "#6FB1B8",
  gold: "#E6AE6C",
} as const;

export type ElementNodeColorKey = keyof typeof ELEMENT_NODE_COLORS;

/**
 * Curated picker palette — design-system hues proven on the dark canvas
 * (element colours + rose / gold-bright). Names are FOUNDER-REVIEW.
 */
// FOUNDER-REVIEW: palette display names — refine voice before merge.
export const STAR_COLOR_PALETTE = [
  { id: "ember", hex: "#E0825C", label: "Ember" },
  { id: "honey", hex: "#E6AE6C", label: "Honey" },
  { id: "dawn", hex: "#f0c089", label: "Dawn" },
  { id: "moss", hex: "#cdbd7a", label: "Moss" },
  { id: "lilac", hex: "#B79AD8", label: "Lilac" },
  { id: "tide", hex: "#6FB1B8", label: "Tide" },
  { id: "rose", hex: "#DA8C8C", label: "Rose" },
] as const;

export type StarColorPaletteId = (typeof STAR_COLOR_PALETTE)[number]["id"];
export type StarColorHex = (typeof STAR_COLOR_PALETTE)[number]["hex"];

const PALETTE_HEX = new Set<string>(STAR_COLOR_PALETTE.map((c) => c.hex));

/** True when value is a curated palette hex (case-sensitive, with leading #). */
export function isStarColorPaletteHex(value: string | null | undefined): boolean {
  if (value == null || value === "") return false;
  return PALETTE_HEX.has(value);
}

/**
 * Normalize a write candidate: null/empty/"default" → null; known hex → hex;
 * unknown → null (never persist arbitrary colors).
 */
export function normalizeStarColorForWrite(value: string | null | undefined): string | null {
  if (value == null || value === "" || value === "default") return null;
  return isStarColorPaletteHex(value) ? value : null;
}

export interface StarColorPerson {
  is_self?: boolean;
  relation?: string | null;
  passed_at?: string | null;
  /** Curated palette hex, or null/undefined for element-derived color. */
  star_color?: string | null;
}

/**
 * Single resolution point for constellation node color:
 *   star_color (palette hex) ?? self-gold / element-from-relation
 *
 * Unknown or non-palette star_color values are ignored so a bad row cannot
 * paint an unreadable custom hex — fall back to the element path.
 */
export function resolveNodeColor(person: StarColorPerson): string {
  if (isStarColorPaletteHex(person.star_color)) {
    return person.star_color as string;
  }
  if (person.is_self) return ELEMENT_NODE_COLORS.gold;
  const el = elementFromRelation(person.relation, person.passed_at);
  return ELEMENT_NODE_COLORS[el as ElementNodeColorKey] ?? ELEMENT_NODE_COLORS.air;
}
