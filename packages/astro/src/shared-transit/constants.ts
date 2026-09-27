/**
 * Named tunables for the shared-transit feed. Carmen can retune these
 * without hunting through scoring or copy code.
 */

import type { AspectType, BodyName } from "../index";

/** Natal points must aspect each other inside this orb to count as "between you". */
export const SYNASTRY_LINK_ORB_DEG = 3;

/** Major aspects only. Quincunx is an adjustment, not a shared-link claim. */
export const SYNASTRY_LINK_ASPECTS: readonly AspectType[] = [
  "conjunction",
  "sextile",
  "square",
  "trine",
  "opposition",
];

/** How many cards the weekly surface renders. */
export const WEEKLY_FEED_LIMIT = 3;

/**
 * Two hits of the same transiting body and aspect are one astronomical
 * pass when their exact instants fall inside this many days.
 */
export const PAIR_EXACTNESS_WINDOW_DAYS: Record<string, number> = {
  sun: 4,
  mercury: 4,
  venus: 5,
  mars: 7,
  jupiter: 21,
  saturn: 28,
  uranus: 45,
  neptune: 45,
  pluto: 45,
};

/** Bodies that change inside a week. They lead the weekly feed. */
export const FAST_WEEKLY_BODIES: readonly BodyName[] = ["sun", "mercury", "venus", "mars"];

/** Bodies whose story persists. Demoted on the weekly surface; kept for long arcs. */
export const SLOW_WEEKLY_BODIES: readonly BodyName[] = ["jupiter", "saturn", "uranus", "neptune", "pluto"];

export const WEEKLY_TRANSIT_BODIES: readonly BodyName[] = [...FAST_WEEKLY_BODIES, ...SLOW_WEEKLY_BODIES];

/**
 * Speed score saturates here (deg/day). Mars and the faster bodies reach 1.
 * Saturn and the outers stay near 0, so a weekly feed prefers what actually moves.
 */
export const SPEED_SCORE_SATURATION_DEG_PER_DAY = 0.4;

/** Weights sum to 1. Orb tightness is the dominant term. */
export const SALIENCE_WEIGHTS = {
  orb: 0.5,
  applying: 0.15,
  speed: 0.25,
  synastry: 0.1,
} as const;

/** Re-show a seen event when its exactness moves by at least this much. */
export const NOVELTY_EXACTNESS_SHIFT_MS = 86_400_000;

/** Cap on the per-user seen ledger. */
export const SHOWN_SHARED_TRANSIT_CAP = 200;

/** How many relational events the daily job persists (split across fast and slow). */
export const SHARED_WEEK_STORE_PER_CADENCE = 12;

const SLOW = new Set<string>(SLOW_WEEKLY_BODIES);

export function isSlowWeeklyBody(body: string): boolean {
  return SLOW.has(body);
}
