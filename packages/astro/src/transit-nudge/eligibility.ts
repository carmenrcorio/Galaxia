import {
  aspectDefinition,
  eclipticLongitude,
  signedAngleDelta,
  type AspectType,
  type BodyName,
  type NatalChart,
  type Precision,
} from "../index";
import { enrichHit } from "./phase";
import type { EnrichedTransitHit, NudgePrecisionMode } from "./types";
import { TRANSIT_THEMES } from "./types";
import { exactnessWindowDeg, withinExactnessWindow } from "./windows";

export function precisionModeFromChart(
  chart: NatalChart | null | undefined,
  birthPrecision?: Precision | "none" | null
): NudgePrecisionMode {
  if (!chart) return "none";
  const p = birthPrecision ?? chart.precision;
  if (p === "none") return "none";
  if (p === "year" || chart.precision === "year") return "year_blocked";
  if (p === "date" || chart.precision === "date") return "date_sign";
  return "exact";
}

/**
 * Whole-day degree smear of a natal body on the birth calendar day.
 */
export function natalDaySmearDeg(body: BodyName, birthDateYYYYMMDD: string): number {
  const [y, m, d] = birthDateYYYYMMDD.slice(0, 10).split("-").map(Number);
  const dayStart = new Date(Date.UTC(y!, m! - 1, d!, 0, 0, 0));
  const dayEnd = new Date(Date.UTC(y!, m! - 1, d!, 23, 59, 59));
  const a = eclipticLongitude(body, dayStart);
  const b = eclipticLongitude(body, dayEnd);
  return Math.abs(signedAngleDelta(a, b));
}

/**
 * In date_sign mode a natal point may be an aspect target ONLY if the aspect
 * stays valid across the whole-day smear of that point. The Moon is always
 * disqualified (moves too far). Angles are never targets (not in placements).
 */
export function dateSignNatalTargetAllowed(
  natalBody: BodyName,
  orbAtNoon: number,
  windowDeg: number,
  smearDeg: number
): boolean {
  if (natalBody === "moon") return false;
  const worstOrb = orbAtNoon + smearDeg / 2;
  return worstOrb <= windowDeg;
}

function rawHitsForChart(
  chart: NatalChart,
  whenUTC: string
): Array<{ transitBody: BodyName; natalBody: BodyName; natalLon: number; type: AspectType; orb: number }> {
  const when = new Date(whenUTC);
  const out: Array<{
    transitBody: BodyName;
    natalBody: BodyName;
    natalLon: number;
    type: AspectType;
    orb: number;
  }> = [];

  for (const transitBody of TRANSIT_THEMES) {
    const transitLon = eclipticLongitude(transitBody, when);
    for (const natal of chart.placements) {
      const angle = Math.abs(signedAngleDelta(transitLon, natal.lon));
      for (const type of ["conjunction", "sextile", "square", "trine", "opposition"] as AspectType[]) {
        const def = aspectDefinition(type);
        const maxOrb = transitBody === "moon" ? Math.min(def.orb, 3) : def.orb;
        const orb = Math.abs(angle - def.angle);
        if (orb <= maxOrb) {
          out.push({
            transitBody,
            natalBody: natal.body,
            natalLon: natal.lon,
            type,
            orb,
          });
        }
      }
    }
  }
  return out;
}

export interface EligibleHitsInput {
  chart: NatalChart;
  whenUTC: string;
  precisionMode: NudgePrecisionMode;
  /** Required for date_sign smear; YYYY-MM-DD. */
  birthDate?: string | null;
}

/**
 * Eligible enriched hits for nudge selection. Enforces exactness windows and
 * date_sign never-fabricate rules in the hit filter (not at render).
 */
export function eligibleNudgeHits(input: EligibleHitsInput): EnrichedTransitHit[] {
  const { chart, whenUTC, precisionMode, birthDate } = input;
  if (precisionMode === "year_blocked" || precisionMode === "none") return [];

  const raw = rawHitsForChart(chart, whenUTC);
  const enriched: EnrichedTransitHit[] = [];

  for (const hit of raw) {
    const window = exactnessWindowDeg(hit.transitBody);
    if (!withinExactnessWindow(hit.transitBody, hit.orb)) continue;

    if (precisionMode === "date_sign") {
      if (!birthDate) continue;
      const smear = natalDaySmearDeg(hit.natalBody, birthDate);
      if (!dateSignNatalTargetAllowed(hit.natalBody, hit.orb, window, smear)) continue;
    }

    enriched.push(
      enrichHit(hit.transitBody, hit.natalBody, hit.natalLon, hit.type, hit.orb, whenUTC)
    );
  }

  return enriched.filter((h) => withinExactnessWindow(h.transitBody, h.orb));
}
