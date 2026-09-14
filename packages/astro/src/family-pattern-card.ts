/**
 * Content helpers for the 1080 family/group pattern card.
 *
 * The card is built from shared *signs* only (planet + sign). Houses, birth
 * dates, times, and places are never read here. First-name stripping lives in
 * the web layer so this module stays chart-data-only.
 */

import { FAMILY_PLANET_LABEL, type SharedPlacementPattern } from "./family-compare";
import { interpretSharedPlacement } from "./family-compare-interpretations";

export const FAMILY_PATTERN_HEADLINE_JOIN = " · ";

/** Headline of the share card: every detected shared placement, sign then planet. */
export function formatSharedPlacementHeadline(shared: SharedPlacementPattern[]): string {
  return shared.map((s) => `${s.sign} ${FAMILY_PLANET_LABEL[s.planet]}`).join(FAMILY_PATTERN_HEADLINE_JOIN);
}

/**
 * One line of the existing shared-placement interpretation: the first
 * sentence of `interpretSharedPlacement()`. No new astrology copy.
 */
export function interpretSharedPlacementCardLine(
  pattern: SharedPlacementPattern,
  totalPeople: number,
): string {
  const full = interpretSharedPlacement(pattern, totalPeople);
  const idx = full.indexOf(". ");
  return idx === -1 ? full : full.slice(0, idx + 1);
}
