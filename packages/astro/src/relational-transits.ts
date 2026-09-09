/**
 * Galaxia Generations — Generational Transit Alerts (Feature 3).
 *
 * Scans a constellation's REAL natal charts for a single slow-moving
 * transiting body (Jupiter, Saturn, Uranus, Neptune, Pluto — the outer
 * bodies that create multi-day/week windows, not the fast inner planets)
 * forming the SAME aspect type to 2+ different people at once. Reuses the
 * exact geometry, exactness-window, and date_sign smear rules the daily
 * nudge engine already uses (transit-nudge/*) — no new orb conventions,
 * no fabricated "active window": the from/to dates are derived from each
 * affected person's real exact-pass date plus the body's own measured
 * daily motion, never a hardcoded "one week."
 */

import {
  aspectDefinition,
  eclipticLongitude,
  longitudeToSign,
  signedAngleDelta,
  type AspectType,
  type BodyName,
  type NatalChart,
  type Precision,
  type Sign,
} from "./index";
import {
  dateSignNatalTargetAllowed,
  exactnessWindowDeg,
  findExactAt,
  natalDaySmearDeg,
  precisionModeFromChart,
  withinExactnessWindow,
} from "./transit-nudge";

export type RelationalTransitBody = "jupiter" | "saturn" | "uranus" | "neptune" | "pluto";

/** The 5 slow movers per the spec — inner planets create daily, not relational, windows. */
export const RELATIONAL_TRANSIT_BODIES: readonly RelationalTransitBody[] = ["jupiter", "saturn", "uranus", "neptune", "pluto"];

/** "Major only" notification preference — Saturn/Uranus/Pluto, per the spec's preference option. */
export const MAJOR_RELATIONAL_TRANSIT_BODIES: readonly RelationalTransitBody[] = ["saturn", "uranus", "pluto"];

const ASPECT_TYPES: readonly AspectType[] = ["conjunction", "sextile", "square", "trine", "opposition"];

const MS_PER_DAY = 86_400_000;

export interface RelationalTransitPersonInput {
  id: string;
  name: string;
  chart: NatalChart;
  /** YYYY-MM-DD, required for the date_sign smear rule (matches transit-nudge convention). */
  birthDate?: string | null;
  birthPrecision?: Precision | "none" | null;
}

export interface AffectedProfileHit {
  personId: string;
  personName: string;
  natalBody: BodyName;
  natalSign: Sign;
  aspectType: AspectType;
  orbDeg: number;
  /** Real geometric exact-pass instant for this person's placement. */
  exactAtUTC: string;
}

export interface RelationalTransitEvent {
  transitBody: RelationalTransitBody;
  transitSign: Sign;
  aspectType: AspectType;
  /** 2+ people — the whole point of a "relational" transit. */
  affected: AffectedProfileHit[];
  activeFromUTC: string;
  activeToUTC: string;
}

/** Real measured daily motion (degrees/day) at `when`, sign-aware (retrograde is negative). */
function transitSpeedDegPerDay(body: BodyName, when: Date): number {
  const lon0 = eclipticLongitude(body, when);
  const lon1 = eclipticLongitude(body, new Date(when.getTime() + MS_PER_DAY));
  return signedAngleDelta(lon0, lon1);
}

/** The single best (lowest-orb) eligible natal target this person offers for a given transit body + aspect, if any. */
function bestEligibleTarget(
  person: RelationalTransitPersonInput,
  transitBody: BodyName,
  transitLon: number,
  aspectType: AspectType
): { natalBody: BodyName; natalSign: Sign; natalLon: number; orb: number } | null {
  const precisionMode = precisionModeFromChart(person.chart, person.birthPrecision);
  if (precisionMode === "year_blocked" || precisionMode === "none") return null;

  const def = aspectDefinition(aspectType);
  const window = exactnessWindowDeg(transitBody);
  let best: { natalBody: BodyName; natalSign: Sign; natalLon: number; orb: number } | null = null;

  for (const natal of person.chart.placements) {
    if (natal.confident === false) continue; // never claim a guessed placement is part of a relational transit
    const angle = Math.abs(signedAngleDelta(transitLon, natal.lon));
    const orb = Math.abs(angle - def.angle);
    if (orb > def.orb) continue;
    if (!withinExactnessWindow(transitBody, orb)) continue;

    if (precisionMode === "date_sign") {
      if (!person.birthDate) continue;
      const smear = natalDaySmearDeg(natal.body, person.birthDate);
      if (!dateSignNatalTargetAllowed(natal.body, orb, window, smear)) continue;
    }

    if (!best || orb < best.orb) best = { natalBody: natal.body, natalSign: natal.sign, natalLon: natal.lon, orb };
  }
  return best;
}

/**
 * Scans all provided people for relational transits active at `whenUTC`
 * (a single representative instant — call this once per day, at owner-local
 * noon, same convention as `whenUTCForOwnerLocalDate`). Deterministic: same
 * inputs always produce the same events.
 */
export function scanRelationalTransits(
  people: RelationalTransitPersonInput[],
  whenUTC: string
): RelationalTransitEvent[] {
  const when = new Date(whenUTC);
  const events: RelationalTransitEvent[] = [];

  for (const transitBody of RELATIONAL_TRANSIT_BODIES) {
    const transitLon = eclipticLongitude(transitBody, when);
    const transitSign = longitudeToSign(transitLon);

    for (const aspectType of ASPECT_TYPES) {
      const affected: AffectedProfileHit[] = [];

      for (const person of people) {
        const target = bestEligibleTarget(person, transitBody, transitLon, aspectType);
        if (!target) continue;
        const exactAt = findExactAt(transitBody, target.natalLon, aspectType, when);
        affected.push({
          personId: person.id,
          personName: person.name,
          natalBody: target.natalBody,
          natalSign: target.natalSign,
          aspectType,
          orbDeg: Number(target.orb.toFixed(3)),
          exactAtUTC: exactAt.toISOString(),
        });
      }

      if (affected.length < 2) continue;

      affected.sort((a, b) => a.orbDeg - b.orbDeg);
      const exactTimesMs = affected.map((a) => new Date(a.exactAtUTC).getTime());
      // Window (days) derived from this body's OWN measured speed today, never
      // a hardcoded constant — a retrograde-slowed Saturn gets a wider real
      // window than a fast-moving one, honestly.
      const speed = Math.abs(transitSpeedDegPerDay(transitBody, when)) || 0.0005;
      const windowDays = Math.min(60, exactnessWindowDeg(transitBody) / speed);
      const activeFromUTC = new Date(Math.min(...exactTimesMs) - windowDays * MS_PER_DAY).toISOString();
      const activeToUTC = new Date(Math.max(...exactTimesMs) + windowDays * MS_PER_DAY).toISOString();

      events.push({ transitBody, transitSign, aspectType, affected, activeFromUTC, activeToUTC });
    }
  }

  // Most-affected, tightest-orb events first — the alert feed's natural lead story.
  return events.sort((a, b) => {
    if (b.affected.length !== a.affected.length) return b.affected.length - a.affected.length;
    return a.affected[0]!.orbDeg - b.affected[0]!.orbDeg;
  });
}

/** True when `whenUTC` falls inside the event's active window — the "is this live right now" check. */
export function isRelationalTransitActive(event: Pick<RelationalTransitEvent, "activeFromUTC" | "activeToUTC">, whenUTC: string): boolean {
  const t = new Date(whenUTC).getTime();
  return t >= new Date(event.activeFromUTC).getTime() && t <= new Date(event.activeToUTC).getTime();
}

/**
 * Stable dedup/upsert key for storing a scanned event: the same real pass,
 * re-scanned on consecutive days as it stays inside its window, always maps
 * to the same key (bucketed by the UTC week containing the earliest exact
 * date), so the daily job can upsert instead of creating duplicate rows —
 * while a genuinely later, distinct pass (different week) still gets its
 * own row rather than silently overwriting an unrelated event.
 */
export function relationalTransitDedupKey(event: Pick<RelationalTransitEvent, "transitBody" | "aspectType" | "affected">): string {
  const ids = event.affected.map((a) => a.personId).sort().join(",");
  const earliestMs = Math.min(...event.affected.map((a) => new Date(a.exactAtUTC).getTime()));
  const weekBucket = Math.floor(earliestMs / (7 * MS_PER_DAY));
  return `${event.transitBody}:${event.aspectType}:${ids}:${weekBucket}`;
}