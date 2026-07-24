import type { BodyName, NatalChart, Placement } from "./index";

/**
 * Provenance helpers for stored natal charts.
 *
 * Synastry scores are a pure function of placement longitudes. A fingerprint of
 * those longitudes is the honest "same chart?" check for saved Compare readings
 * — birth-field strings alone miss silent chart rewrites (engine backfill that
 * rebuilds dateUTC differently while people.* fields stay unchanged).
 *
 * Does not touch scoring. House/cusp/label changes do not affect this fingerprint.
 */

/** Stable per-chart fingerprint of body longitudes used by computeSynastry. */
export function chartPlacementFingerprint(chart: Pick<NatalChart, "placements">): string {
  return [...chart.placements]
    .map((p) => `${p.body}:${p.lon.toFixed(6)}`)
    .sort()
    .join("|");
}

/** Pair fingerprint in a fixed person-id order (pairLow // pairHigh). */
export function pairChartFingerprint(
  chartLow: Pick<NatalChart, "placements">,
  chartHigh: Pick<NatalChart, "placements">
): string {
  return `${chartPlacementFingerprint(chartLow)}//${chartPlacementFingerprint(chartHigh)}`;
}

export function placementsLongitudeChanged(
  before: Pick<NatalChart, "placements">,
  after: Pick<NatalChart, "placements">
): boolean {
  return chartPlacementFingerprint(before) !== chartPlacementFingerprint(after);
}

/** Bodies whose longitude moved between two charts (house-only rewrites → []). */
export function bodiesWithMovedLongitudes(
  before: Pick<NatalChart, "placements">,
  after: Pick<NatalChart, "placements">
): BodyName[] {
  const beforeByBody = new Map<string, number>();
  for (const p of before.placements) beforeByBody.set(p.body, Number(p.lon.toFixed(6)));
  const afterByBody = new Map<string, number>();
  for (const p of after.placements) afterByBody.set(p.body, Number(p.lon.toFixed(6)));

  const names = new Set<string>([...beforeByBody.keys(), ...afterByBody.keys()]);
  const moved: BodyName[] = [];
  for (const name of [...names].sort()) {
    if (beforeByBody.get(name) !== afterByBody.get(name)) {
      moved.push(name as BodyName);
    }
  }
  return moved;
}

/** Cap for display: "Sun, Moon, Mercury" — caller owns FOUNDER-REVIEW framing. */
export function formatMovedBodies(bodies: BodyName[]): string {
  if (bodies.length === 0) return "";
  const cap = (b: string) => b.charAt(0).toUpperCase() + b.slice(1);
  return bodies.map(cap).join(", ");
}

/** True when two placement lists match on body→lon at fingerprint precision. */
export function samePlacementLongitudes(a: Placement[], b: Placement[]): boolean {
  return chartPlacementFingerprint({ placements: a }) === chartPlacementFingerprint({ placements: b });
}
