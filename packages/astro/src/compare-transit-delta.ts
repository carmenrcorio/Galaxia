/**
 * Pair-scoped transit delta for Compare history.
 *
 * Natal synastry (`computeSynastry`) is constant for two birth charts.
 * What moves is the sky against those natals. This module recomputes
 * active transits at two timestamps and diffs them. It does not change
 * synastry scoring, orbs, or aspect selection.
 *
 * Active = the same 1.5° orb the person page uses for "Active today"
 * (`todayTransitsForChart`), without that helper's display cap of 3,
 * so a fourth hit cannot masquerade as "moved on".
 */

import { computeTransits, type AspectType, type BodyName, type NatalChart, type TransitHit } from "./index";

/** Same orb gate as `todayTransitsForChart` / "Active today". */
export const PAIR_TRANSIT_ACTIVE_ORB_DEG = 1.5;

export interface PairPersonChart {
  personId: string;
  chart: NatalChart | null | undefined;
  /** False for remembrance profiles (no live transit surface). */
  include: boolean;
}

export interface PairTransitHit {
  personId: string;
  transitBody: BodyName;
  natalBody: BodyName;
  type: AspectType;
  orb: number;
}

export function pairTransitIdentity(
  personId: string,
  hit: Pick<PairTransitHit, "transitBody" | "natalBody" | "type">
): string {
  return `${personId}|${hit.transitBody}|${hit.type}|${hit.natalBody}`;
}

/**
 * Year-only charts have sampled longitudes. A transit orb against them
 * would be a guess (ENGINEERING.md §12).
 */
export function pairTransitsAreHonest(charts: Array<NatalChart | null | undefined>): boolean {
  return charts.every((chart) => Boolean(chart) && chart!.precision !== "year");
}

export function activePairTransits(people: readonly PairPersonChart[], whenUTC: string): PairTransitHit[] {
  const out: PairTransitHit[] = [];
  for (const person of people) {
    if (!person.include || !person.chart || person.chart.precision === "year") continue;
    for (const hit of computeTransits(person.chart, whenUTC) as TransitHit[]) {
      if (hit.orb > PAIR_TRANSIT_ACTIVE_ORB_DEG) continue;
      out.push({
        personId: person.personId,
        transitBody: hit.transitBody,
        natalBody: hit.natalBody,
        type: hit.type,
        orb: hit.orb
      });
    }
  }
  out.sort((a, b) => {
    if (a.orb !== b.orb) return a.orb - b.orb;
    return pairTransitIdentity(a.personId, a).localeCompare(pairTransitIdentity(b.personId, b));
  });
  return out;
}

export function diffPairTransits(
  previous: readonly PairTransitHit[],
  current: readonly PairTransitHit[]
): { movedOn: PairTransitHit[]; newlyActive: PairTransitHit[] } {
  const prevKeys = new Set(previous.map((hit) => pairTransitIdentity(hit.personId, hit)));
  const currKeys = new Set(current.map((hit) => pairTransitIdentity(hit.personId, hit)));
  return {
    movedOn: previous.filter((hit) => !currKeys.has(pairTransitIdentity(hit.personId, hit))),
    newlyActive: current.filter((hit) => !prevKeys.has(pairTransitIdentity(hit.personId, hit)))
  };
}
