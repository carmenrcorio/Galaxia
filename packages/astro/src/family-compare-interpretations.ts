/**
 * Static, warm copy for chart-comparison patterns across a group of people
 * — family, friends, coworkers, or any other group kind. No AI call — these
 * are template strings keyed by real computed data (shared sign, dominant
 * element, missing element/modality), mirroring the deterministic-copy
 * convention already used by ELEMENT_DOMINANT/ELEMENT_ABSENT
 * (interpretations.ts) and SIGN_VIBE (compare-guidance.ts), just re-framed
 * for a GROUP rather than a single person or a pair.
 */

import { SIGN_VIBE } from "./compare-guidance";
import type { Element, FamilyPlanet, Modality, SharedPlacementPattern } from "./family-compare";

const PLANET_GROUP_DOMAIN: Record<FamilyPlanet, string> = {
  sun: "what this group shines toward and builds its identity around",
  moon: "how this group feels things and comforts each other",
  rising: "the face this group shows the world before anyone speaks",
  mercury: "how this group talks things through",
  venus: "how this group loves and what it values",
  mars: "how this group pushes forward and handles friction",
};

/** "Three of you", "All of you", "Two of you" — never a raw count with no group-size context. */
function countPhrase(shareCount: number, totalPeople: number): string {
  if (shareCount >= totalPeople) return "All of you";
  if (shareCount === 2) return "Two of you";
  if (shareCount === 3) return "Three of you";
  if (shareCount === 4) return "Four of you";
  return `${shareCount} of you`;
}

/** e.g. "Three of you carry Capricorn Moon — how this group feels things and comforts each other, and here it runs disciplined, ambitious, quietly loyal." */
export function interpretSharedPlacement(pattern: SharedPlacementPattern, totalPeople: number): string {
  const vibe = SIGN_VIBE[pattern.sign] ?? pattern.sign.toLowerCase();
  const domain = PLANET_GROUP_DOMAIN[pattern.planet];
  const label = pattern.planet === "rising" ? "Rising" : `${pattern.planet[0]!.toUpperCase()}${pattern.planet.slice(1)}`;
  // FOUNDER-REVIEW: rewritten (no U+2014).
  return `${countPhrase(pattern.personIds.length, totalPeople)} carry ${pattern.sign} ${label}. ${domain}, and here it runs ${vibe}.`;
}

const GROUP_ELEMENT_DOMINANT: Record<Element, string> = {
  fire: "This group runs hot as a unit: quick to act, quick to want something out loud, and happiest when there's somewhere to point all that energy.",
  earth: "This group is built on the tangible: steady, practical, and more persuaded by what someone does than by what they say.",
  air: "This group lives in conversation: ideas get talked through, argued over, and cooled down by thinking rather than feeling.",
  water: "This group feels the room before anyone speaks: a shared sensitivity that means moods travel fast between you, for better and worse.",
};

/** e.g. "Three of your five confident placements land in earth — this group is built on the tangible..." */
export function interpretDominantElement(element: Element, count: number, total: number): string {
  return `${count} of your ${total} confident placements land in ${element}. ${GROUP_ELEMENT_DOMINANT[element]}`;
}

const GROUP_ELEMENT_MISSING: Record<Element, string> = {
  fire: "no fire: the spark to act first and want things out loud might be a perspective this group seeks from someone outside it.",
  earth: "no earth: nobody here is naturally the one who slows things down to what's practical; that grounding may need to come from outside the group.",
  air: "no air: nobody is reliably the one to talk it through and cool it down with logic; that clarity may be worth borrowing from elsewhere.",
  water: "no water: nobody is naturally reading the emotional weather in the room; that attunement may be a gift this group finds in someone else.",
};

/** Framed positively per spec: "the perspective this group might seek from outside." */
export function interpretMissingElement(element: Element): string {
  return `Among the placements compared, there's ${GROUP_ELEMENT_MISSING[element]}`;
}

const GROUP_MODALITY_MISSING: Record<Modality, string> = {
  cardinal: "no cardinal energy: the instinct to start things and go first may not live naturally in this group.",
  fixed: "no fixed energy: staying the course once the excitement fades may take more conscious effort here.",
  mutable: "no mutable energy: adapting when the plan changes may not come as easily to this group as making the plan did.",
};

export function interpretMissingModality(modality: Modality): string {
  return `And there's ${GROUP_MODALITY_MISSING[modality]}`;
}
