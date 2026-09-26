/**
 * Embedded Chiron (2060) tropical longitude. astronomy-engine has no
 * Body.Chiron; Swiss Ephemeris is AGPL and is not a dependency
 * (CHANGELOG.md, design/galaxia-natal-chart-standard.md §3).
 *
 * Positions come from a JPL Horizons sample table interpolated linearly.
 * See chiron-ephemeris-data.ts for the source comment.
 */
import { CHIRON_JD0, CHIRON_LON_DEG, CHIRON_STEP_DAYS } from "./chiron-ephemeris-data";

const CHIRON_JD_LAST = CHIRON_JD0 + (CHIRON_LON_DEG.length - 1) * CHIRON_STEP_DAYS;

function normalizeZodiacLongitude(lon: number): number {
  const wrapped = lon % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

function normalizeSignedAngle(delta: number): number {
  let adjusted = delta % 360;
  if (adjusted > 180) adjusted -= 360;
  if (adjusted < -180) adjusted += 360;
  return adjusted;
}

/** Julian Day (UTC) for a civil instant. Matches the natal engine's JD. */
export function julianDayUTC(date: Date): number {
  return date.getTime() / 86_400_000 + 2_440_587.5;
}

export function isChironEphemerisCovered(jd: number): boolean {
  return jd >= CHIRON_JD0 && jd <= CHIRON_JD_LAST;
}

/**
 * Geocentric apparent ecliptic longitude of Chiron (0–360, tropical).
 * Linear interpolation between 10-day samples. Throws outside 1900–2101.
 */
export function chironLongitude(jd: number): number {
  if (!Number.isFinite(jd) || jd < CHIRON_JD0 || jd > CHIRON_JD_LAST) {
    throw new Error(
      `Chiron ephemeris covers 1900-01-01 to 2101-01-15; JD ${jd} is outside that range.`
    );
  }
  const t = (jd - CHIRON_JD0) / CHIRON_STEP_DAYS;
  const i = Math.min(Math.floor(t), CHIRON_LON_DEG.length - 2);
  const f = t - i;
  const a = CHIRON_LON_DEG[i]!;
  const b = CHIRON_LON_DEG[i + 1]!;
  let delta = b - a;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return normalizeZodiacLongitude(a + f * delta);
}

export function chironLongitudeAt(date: Date): number {
  return chironLongitude(julianDayUTC(date));
}

/** True when tomorrow's longitude is behind today's (negative ecliptic velocity). */
export function chironIsRetrograde(date: Date): boolean {
  const today = chironLongitudeAt(date);
  const tomorrow = chironLongitudeAt(new Date(date.getTime() + 86_400_000));
  return normalizeSignedAngle(tomorrow - today) < 0;
}
