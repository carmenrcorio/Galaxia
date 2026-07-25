import {
  aspectDefinition,
  eclipticLongitude,
  signedAngleDelta,
  type AspectType,
  type BodyName,
} from "../index";
import { ASPECT_CLASS, type EnrichedTransitHit, type TransitPhase } from "./types";

const MS_PER_DAY = 86_400_000;
const EXACT_ORB_DEG = 0.05;

/** Absolute separation 0–180 between two longitudes. */
export function separationDeg(a: number, b: number): number {
  return Math.abs(signedAngleDelta(a, b));
}

/** Signed distance from current separation to the aspect angle (−180…180). */
export function signedDistanceToAspect(separation: number, aspectAngle: number): number {
  return separation - aspectAngle;
}

function transitSpeedDegPerDay(body: BodyName, when: Date): number {
  const lon0 = eclipticLongitude(body, when);
  const lon1 = eclipticLongitude(body, new Date(when.getTime() + MS_PER_DAY));
  return signedAngleDelta(lon0, lon1);
}

function isRetrograde(body: BodyName, when: Date): boolean {
  return transitSpeedDegPerDay(body, when) < 0;
}

/**
 * Estimate the UTC instant of exact aspect. Walks from `when` using the body's
 * speed, then refines with binary search. Outer planets reverse — each station
 * crossing is a distinct exact and therefore a distinct pass_id.
 */
export function findExactAt(
  transitBody: BodyName,
  natalLon: number,
  aspectType: AspectType,
  when: Date
): Date {
  const target = aspectDefinition(aspectType).angle;
  const speed0 = transitSpeedDegPerDay(transitBody, when);
  const sep0 = separationDeg(eclipticLongitude(transitBody, when), natalLon);
  const dist0 = signedDistanceToAspect(sep0, target);

  // Linear first guess. When nearly stationary, search a wide window.
  let guessMs = when.getTime();
  if (Math.abs(speed0) > 1e-6) {
    // Closing the absolute separation: if dist>0 we are wide; move toward
    // decreasing |sep - target|. Sign of speed × geometry is approximate —
    // binary search corrects.
    const days = -dist0 / speed0;
    if (Number.isFinite(days) && Math.abs(days) < 800) {
      guessMs = when.getTime() + days * MS_PER_DAY;
    }
  }

  const windowDays = Math.abs(speed0) < 0.01 ? 400 : Math.min(120, Math.max(8, Math.abs(dist0 / (speed0 || 0.01)) * 2));
  let lo = guessMs - windowDays * MS_PER_DAY;
  let hi = guessMs + windowDays * MS_PER_DAY;

  const orbAt = (ms: number) => {
    const sep = separationDeg(eclipticLongitude(transitBody, new Date(ms)), natalLon);
    return Math.abs(signedDistanceToAspect(sep, target));
  };

  // Expand until the window brackets a local minimum near zero.
  for (let expand = 0; expand < 4 && orbAt(guessMs) > 1; expand += 1) {
    lo -= windowDays * MS_PER_DAY;
    hi += windowDays * MS_PER_DAY;
    // Resample midpoint toward smaller orb.
    const mid = (lo + hi) / 2;
    if (orbAt(mid) < orbAt(guessMs)) guessMs = mid;
  }

  // Ternary search on orb (unimodal near a single pass).
  for (let i = 0; i < 48; i += 1) {
    const m1 = lo + (hi - lo) / 3;
    const m2 = hi - (hi - lo) / 3;
    if (orbAt(m1) < orbAt(m2)) hi = m2;
    else lo = m1;
  }
  return new Date((lo + hi) / 2);
}

export function phaseAt(
  transitBody: BodyName,
  natalLon: number,
  aspectType: AspectType,
  when: Date,
  exactAt: Date
): TransitPhase {
  const target = aspectDefinition(aspectType).angle;
  const orb = Math.abs(
    signedDistanceToAspect(separationDeg(eclipticLongitude(transitBody, when), natalLon), target)
  );
  if (orb <= EXACT_ORB_DEG) return "exact";
  const msDelta = exactAt.getTime() - when.getTime();
  if (Math.abs(msDelta) < 3_600_000) return "exact"; // within ~1h of exact
  return msDelta > 0 ? "applying" : "separating";
}

/**
 * Stable pass id — includes rounded exact timestamp and D/R so each
 * retrograde re-pass of the same body-pair-aspect is distinct.
 */
export function buildPassId(
  transitBody: BodyName,
  natalBody: BodyName,
  aspectType: AspectType,
  exactAt: Date,
  retrogradeAtExact: boolean
): string {
  const isoHour = new Date(Math.round(exactAt.getTime() / 3_600_000) * 3_600_000).toISOString();
  return `${transitBody}:${natalBody}:${aspectType}:${isoHour}:${retrogradeAtExact ? "R" : "D"}`;
}

/** Enrich a raw geometry hit with phase / exact_at / pass_id. */
export function enrichHit(
  transitBody: BodyName,
  natalBody: BodyName,
  natalLon: number,
  aspectType: AspectType,
  orb: number,
  whenUTC: string
): EnrichedTransitHit {
  const when = new Date(whenUTC);
  const exactAt = findExactAt(transitBody, natalLon, aspectType, when);
  const retrogradeAtExact = isRetrograde(transitBody, exactAt);
  const phase = phaseAt(transitBody, natalLon, aspectType, when, exactAt);
  return {
    transitBody,
    natalBody,
    type: aspectType,
    aspectClass: ASPECT_CLASS[aspectType],
    orb: Number(orb.toFixed(4)),
    phase,
    exactAt: exactAt.toISOString(),
    passId: buildPassId(transitBody, natalBody, aspectType, exactAt, retrogradeAtExact),
    retrogradeAtExact,
  };
}
