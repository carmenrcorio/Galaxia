/**
 * Natal retrograde badge copy. The engine already stores this as
 * `Placement.retro` (negative ecliptic longitude velocity at the birth
 * moment). Surfaces render the badge only when that flag is true.
 */

/** FOUNDER-REVIEW: conventional natal abbreviation for a retrograde planet. */
export const RETROGRADE_BADGE_LABEL = "Rx";

/** FOUNDER-REVIEW: accessible name for the retrograde badge. */
export const RETROGRADE_BADGE_ARIA_LABEL = "Retrograde";

export function isPlacementRetrograde(placement: { retro?: boolean }): boolean {
  return placement.retro === true;
}
