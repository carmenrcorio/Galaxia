/**
 * WS-B. Call something "between you" only when the two natal points the
 * transit touches already aspect each other. An incidental co-transit
 * (same sky, unrelated points) is not a shared card.
 */

import { aspectDefinition, signedAngleDelta, type AspectType } from "../index";
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
 */
export function sharedTransitRole(
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
