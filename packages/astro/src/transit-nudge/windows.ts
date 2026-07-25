import type { BodyName } from "../index";

/**
 * Per-body DEGREE window around each pass's exact. Outside this orb the hit
 * is ineligible — a two-year outer transit only fires near each exact pass.
 * Tuned tighter for slower bodies so daily repetition dies between passes.
 */
export const EXACTNESS_WINDOW_DEG: Record<BodyName, number> = {
  sun: 1.2,
  moon: 1.5,
  mercury: 1.2,
  venus: 1.2,
  mars: 1.0,
  jupiter: 0.75,
  saturn: 0.55,
  uranus: 0.4,
  neptune: 0.35,
  pluto: 0.3,
};

export function exactnessWindowDeg(transitBody: BodyName): number {
  return EXACTNESS_WINDOW_DEG[transitBody];
}

/** True when absolute orb is inside the transit body's exactness window. */
export function withinExactnessWindow(transitBody: BodyName, orbDeg: number): boolean {
  return orbDeg <= exactnessWindowDeg(transitBody);
}
