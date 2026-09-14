/**
 * Deterministic Vela voice for The Moment.
 *
 * Not an LLM call. The paragraph is assembled from the stored snapshot
 * only: named transits that were actually present, or a plain quiet line.
 * The moment type is never an input, so the sky cannot be made to "explain"
 * a hard conversation or a celebration.
 */

import { describeTransit } from "./transits";
import { transitNotation } from "./transit-interpretations";
import type {
  MomentHonesty,
  MomentSideHonesty,
  MomentTransitHit,
  MomentTransitSnapshot
} from "./moment-snapshot";

export const MOMENT_REFLECTION_HIT_CAP = 2;

export interface MomentReflectionInput {
  snapshot: MomentTransitSnapshot;
  personName: string;
  isSelf: boolean;
}

function orbLabel(orb: number): string {
  return `${orb.toFixed(1)}°`;
}

function hitSentence(hit: MomentTransitHit): string {
  const possessive = hit.whose === "you" ? "your" : "their";
  return `${describeTransit(hit, possessive)} (${orbLabel(hit.orb)})`;
}

function cannotName(reason: MomentSideHonesty, personName: string): string | null {
  if (reason === "year_precision") {
    // FOUNDER-REVIEW: authored. Year-only chart cannot support an orb.
    return `We cannot name a transit for ${personName}. A birth year on file is not enough for an honest orb.`;
  }
  if (reason === "missing_chart") {
    // FOUNDER-REVIEW: authored. No chart on file.
    return `We cannot name a transit for ${personName}. There is no chart on file yet.`;
  }
  if (reason === "remembrance") {
    // FOUNDER-REVIEW: authored. Remembrance profiles have no live sky.
    return "Live transits are not shown on a remembrance profile.";
  }
  return null;
}

function standsOnItsOwn(): string {
  // FOUNDER-REVIEW: authored. Quiet or unnameable sky. Never invent an aspect.
  return "This moment stands on its own.";
}

function quietBetween(personName: string, isSelf: boolean, snapshot: MomentTransitSnapshot): string {
  if (isSelf || (snapshot.includedYou && !snapshot.includedThem && snapshot.themHonesty === "absent")) {
    // FOUNDER-REVIEW: authored. Quiet sky, self.
    return `Nothing significant was active in your sky then. ${standsOnItsOwn()}`;
  }
  if (snapshot.includedYou && snapshot.includedThem) {
    // FOUNDER-REVIEW: authored. Quiet sky between two living charts.
    return `Nothing significant was active between you and ${personName} then. ${standsOnItsOwn()}`;
  }
  if (snapshot.includedThem && !snapshot.includedYou) {
    // FOUNDER-REVIEW: authored. Quiet sky, their chart only.
    return `Nothing significant was active in ${personName}'s sky then. ${standsOnItsOwn()}`;
  }
  if (snapshot.includedYou && !snapshot.includedThem) {
    // FOUNDER-REVIEW: authored. Quiet sky, your chart only.
    return `Nothing significant was active in your sky then. ${standsOnItsOwn()}`;
  }
  return `${cannotName(snapshot.themHonesty, personName) ?? cannotName(snapshot.youHonesty, personName) ?? "We cannot name a transit here."} ${standsOnItsOwn()}`;
}

function honestyOnly(snapshot: MomentTransitSnapshot, personName: string, isSelf: boolean): string {
  const reason: MomentHonesty = snapshot.honesty;
  if (reason === "remembrance") {
    // FOUNDER-REVIEW: authored.
    return `Live transits are not shown on a remembrance profile. ${standsOnItsOwn()}`;
  }
  if (reason === "year_precision") {
    if (isSelf) {
      // FOUNDER-REVIEW: authored.
      return `We cannot name a transit here. A birth year on file is not enough for an honest orb. ${standsOnItsOwn()}`;
    }
    // FOUNDER-REVIEW: authored.
    return `We cannot name a transit here. ${personName}'s chart is year-only, so an orb would be a guess. ${standsOnItsOwn()}`;
  }
  if (isSelf) {
    // FOUNDER-REVIEW: authored.
    return `We cannot name a transit here. There is no chart on file yet. ${standsOnItsOwn()}`;
  }
  // FOUNDER-REVIEW: authored.
  return `We cannot name a transit here. There is no chart on file for ${personName} yet. ${standsOnItsOwn()}`;
}

/**
 * One short reflection from stored hits. Caps at two named transits.
 * Never names a body that is not in the snapshot.
 */
export function reflectMoment(input: MomentReflectionInput): string {
  const { snapshot, personName, isSelf } = input;
  if (snapshot.honesty !== "ok") {
    return honestyOnly(snapshot, personName, isSelf);
  }
  if (snapshot.hits.length === 0) {
    return quietBetween(personName, isSelf, snapshot);
  }

  const named = snapshot.hits.slice(0, MOMENT_REFLECTION_HIT_CAP).map(hitSentence);
  // FOUNDER-REVIEW: authored. Lead that locates the named transits in time.
  const lead = named.length === 1
    ? `At that hour, ${named[0]}.`
    : `At that hour, ${named[0]}. ${named[1]!.charAt(0).toUpperCase()}${named[1]!.slice(1)}.`;

  const missingThem = !isSelf && snapshot.includedYou && !snapshot.includedThem
    ? cannotName(snapshot.themHonesty, personName)
    : null;
  if (missingThem) return `${lead} ${missingThem}`;
  return lead;
}

export function formatMomentHitProof(hit: MomentTransitHit): string {
  const whose = hit.whose === "you" ? "your" : "their";
  return `${transitNotation(hit)} (${whose}, ${orbLabel(hit.orb)})`;
}

/**
 * Record timeline sky line from the stored snapshot. Never recomputes.
 */
export function formatMomentSkyContext(
  snapshot: MomentTransitSnapshot,
  opts: { personName: string; isSelf: boolean }
): string {
  if (snapshot.honesty !== "ok") {
    return honestyOnly(snapshot, opts.personName, opts.isSelf);
  }
  if (snapshot.hits.length === 0) {
    return quietBetween(opts.personName, opts.isSelf, snapshot);
  }
  return snapshot.hits.map(formatMomentHitProof).join(". ");
}
