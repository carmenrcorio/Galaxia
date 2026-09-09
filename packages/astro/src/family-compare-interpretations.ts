/**
 * Static, warm copy for Family Chart Comparison patterns. No AI call — these
 * are template strings keyed by real computed data (shared sign, dominant
 * element, missing element/modality), mirroring the deterministic-copy
 * convention already used by ELEMENT_DOMINANT/ELEMENT_ABSENT
 * (interpretations.ts) and SIGN_VIBE (compare-guidance.ts), just re-framed
 * for a GROUP rather than a single person or a pair.
 */

import { SIGN_VIBE } from "./compare-guidance";
import type { Element, FamilyPlanet, Modality, SharedPlacementPattern } from "./family-compare";

const PLANET_FAMILY_DOMAIN: Record<FamilyPlanet, string> = {
  sun: "what this family shines toward and builds its identity around",
  moon: "how this family feels things and comforts each other",
  rising: "the face this family shows the world before anyone speaks",
  mercury: "how this family talks things through",
  venus: "how this family loves and what it values",
  mars: "how this family pushes forward and handles friction",
};

/** "Three of you", "All of you", "Two of you" — never a raw count with no group-size context. */
function countPhrase(shareCount: number, totalPeople: number): string {
  if (shareCount >= totalPeople) return "All of you";
  if (shareCount === 2) return "Two of you";
  if (shareCount === 3) return "Three of you";
  if (shareCount === 4) return "Four of you";
  return `${shareCount} of you`;
}

/** e.g. "Three of you carry Capricorn Moon — how this family feels things and comforts each other, and here it runs disciplined, ambitious, quietly loyal." */
export function interpretSharedPlacement(pattern: SharedPlacementPattern, totalPeople: number): string {
  const vibe = SIGN_VIBE[pattern.sign] ?? pattern.sign.toLowerCase();
  const domain = PLANET_FAMILY_DOMAIN[pattern.planet];
  const label = pattern.planet === "rising" ? "Rising" : `${pattern.planet[0]!.toUpperCase()}${pattern.planet.slice(1)}`;
  return `${countPhrase(pattern.personIds.length, totalPeople)} carry ${pattern.sign} ${label} — ${domain}, and here it runs ${vibe}.`;
}

const FAMILY_ELEMENT_DOMINANT: Record<Element, string> = {
  fire: "This family runs hot as a group — quick to act, quick to want something out loud, and happiest when there's somewhere to point all that energy.",
  earth: "This family is built on the tangible — steady, practical, and more persuaded by what someone does than by what they say.",
  air: "This family lives in conversation — ideas get talked through, argued over, and cooled down by thinking rather than feeling.",
  water: "This family feels the room before anyone speaks — a shared sensitivity that means moods travel fast between you, for better and worse.",
};

/** e.g. "Three of your five confident placements land in earth — this family is built on the tangible..." */
export function interpretDominantElement(element: Element, count: number, total: number): string {
  return `${count} of your ${total} confident placements land in ${element} — ${FAMILY_ELEMENT_DOMINANT[element]}`;
}

const FAMILY_ELEMENT_MISSING: Record<Element, string> = {
  fire: "no fire — the spark to act first and want things out loud might be a perspective this group seeks from someone outside it.",
  earth: "no earth — nobody here is naturally the one who slows things down to what's practical; that grounding may need to come from outside the group.",
  air: "no air — nobody is reliably the one to talk it through and cool it down with logic; that clarity may be worth borrowing from elsewhere.",
  water: "no water — nobody is naturally reading the emotional weather in the room; that attunement may be a gift this group finds in someone else.",
};

/** Framed positively per spec: "the perspective this group might seek from outside." */
export function interpretMissingElement(element: Element): string {
  return `Among the placements compared, there's ${FAMILY_ELEMENT_MISSING[element]}`;
}

const FAMILY_MODALITY_MISSING: Record<Modality, string> = {
  cardinal: "no cardinal energy — the instinct to start things and go first may not live naturally in this group.",
  fixed: "no fixed energy — staying the course once the excitement fades may take more conscious effort here.",
  mutable: "no mutable energy — adapting when the plan changes may not come as easily to this group as making the plan did.",
};

export function interpretMissingModality(modality: Modality): string {
  return `And there's ${FAMILY_MODALITY_MISSING[modality]}`;
}
