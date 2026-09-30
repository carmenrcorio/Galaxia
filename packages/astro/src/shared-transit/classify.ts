/**
 * WS-B. Call something "between you" only when the two natal points the
 * transit touches already aspect each other. An incidental co-transit
 * (same sky, unrelated points) is not a shared card.
 */

import { isChartPoint } from "../bodies";
import { aspectDefinition, signedAngleDelta, type AspectType, type BodyName, type NatalChart, type Precision } from "../index";
import { precisionModeFromChart } from "../transit-nudge";
import { SYNASTRY_LINK_ASPECTS, SYNASTRY_LINK_ORB_DEG } from "./constants";
import type { SharedTransitRole, SharedTransitSynastryLink } from "./types";

export function synastryLinkForLongitudes(
  lonA: number,
  lonB: number,
  maxOrbDeg: number = SYNASTRY_LINK_ORB_DEG
): SharedTransitSynastryLink | null {
  const separation = Math.abs(signedAngleDelta(lonA, lonB));
  let best: { aspect: AspectType; orb: number } | null = null;
  for (const aspect of SYNASTRY_LINK_ASPECTS) {
    const orb = Math.abs(separation - aspectDefinition(aspect).angle);
    if (orb > maxOrbDeg) continue;
    if (!best || orb < best.orb) best = { aspect, orb };
  }
  if (!best) return null;
  return {
    aspectBetweenNatalPoints: best.aspect,
    orb: Number(best.orb.toFixed(3)),
  };
}

const PARTNER = new Set(["partner", "ex"]);
const PARENT_OR_CHILD = new Set(["parent", "mother", "father", "grandparent", "child", "grandchild"]);
const SIBLING = new Set(["sibling"]);
const FRIEND = new Set(["friend"]);

/**
 * Role for copy. Uses the owner-relative relation only when one person is
 * the owner, because that field describes that pair. Two other people
 * stay "circle" rather than a guessed bond.
 *
 * A minor never gets the partner frame, even when the stored label is
 * "partner" or "ex". Family labels stay family (parent-child, siblings).
 * Every other label, including partner, becomes "circle": the person frame,
 * which asserts no bond.
 */
export function sharedTransitRole(
  a: { isSelf?: boolean; relation?: string | null; isMinor?: boolean },
  b: { isSelf?: boolean; relation?: string | null; isMinor?: boolean }
): SharedTransitRole {
  const role = roleFromRelation(a, b);
  if (!a.isMinor && !b.isMinor) return role;
  if (role === "parent-child" || role === "siblings") return role;
  return "circle";
}

function roleFromRelation(
  a: { isSelf?: boolean; relation?: string | null },
  b: { isSelf?: boolean; relation?: string | null }
): SharedTransitRole {
  if (!a.isSelf && !b.isSelf) return "circle";
  const other = String((a.isSelf ? b.relation : a.relation) ?? "").trim().toLowerCase();
  if (PARTNER.has(other)) return "partners";
  if (PARENT_OR_CHILD.has(other)) return "parent-child";
  if (SIBLING.has(other)) return "siblings";
  if (FRIEND.has(other)) return "friends";
  return "circle";
}

/**
 * Longitude the current scanner would use for this natal point.
 * Null when the chart is missing, year-blocked, unconfident, or not a
 * body the scanner targets. Zero is a real longitude, not a placeholder.
 */
export function scannerNatalLongitude(
  chart: NatalChart | null | undefined,
  natalBody: string,
  birthPrecision?: Precision | "none" | null
): number | null {
  if (!chart || !Array.isArray(chart.placements)) return null;
  const mode = precisionModeFromChart(chart, birthPrecision);
  if (mode === "year_blocked" || mode === "none") return null;
  if (isChartPoint(natalBody)) return null;
  const placement = chart.placements.find((row) => row.body === (natalBody as BodyName));
  if (!placement || placement.confident === false || !Number.isFinite(placement.lon)) return null;
  return placement.lon;
}

/**
 * Same synastry inclusion the weekly scanner uses before it will call a
 * pair relational. Missing longitudes fail closed. Does not treat 0 as
 * missing: 0° and 0° is a real conjunction.
 */
export function storedPairPassesScannerGate(lonA: number | null, lonB: number | null): boolean {
  if (lonA === null || lonB === null) return false;
  if (!Number.isFinite(lonA) || !Number.isFinite(lonB)) return false;
  return synastryLinkForLongitudes(lonA, lonB) !== null;
}
