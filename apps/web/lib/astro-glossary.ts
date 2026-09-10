/**
 * Beginner glossary for planet and sign names on the Groups page.
 *
 * One plain-English line each. Static, curated, never generated
 * (ENGINEERING.md §12). Popover copy for GlossaryTerm.
 */

export const PLANET_KEYS = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
] as const;

export type PlanetKey = (typeof PLANET_KEYS)[number];

export const SIGN_KEYS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
] as const;

export type SignKey = (typeof SIGN_KEYS)[number];

// FOUNDER-REVIEW: authored. Beginner planet meanings, one line each.
export const PLANET_MEANINGS: Record<PlanetKey, string> = {
  sun: "The core self: what a person wants to be seen as, and where they shine.",
  moon: "Emotional needs: what makes someone feel safe, soothed, and at home.",
  mercury: "The mind and voice: how someone thinks, talks, and takes in information.",
  venus: "How someone loves, values beauty, and decides what is worth keeping.",
  mars: "Drive and conflict: how someone acts, pursues, and fights for what they want.",
  jupiter: "Where someone grows, hopes, and looks for meaning or a bigger life.",
  saturn: "Duty and limits: where someone feels the need to get it right, and the cost of that.",
  uranus: "How someone breaks the mold and handles sudden change.",
  neptune: "Where someone dreams, blurs edges, and can get lost in an ideal.",
  pluto: "Where someone meets power, control, and deep transformation.",
};

// FOUNDER-REVIEW: authored. Beginner sign meanings, one line each.
export const SIGN_MEANINGS: Record<SignKey, string> = {
  Aries: "Bold, first-out-the-gate energy that starts things and does not wait.",
  Taurus: "Steady, sensory, and built to last. Hard to rush, loyal to what is already working.",
  Gemini: "Curious and talkative, always collecting another idea or another conversation.",
  Cancer: "Protective and feeling-led, oriented around home, memory, and care.",
  Leo: "Warm and expressive, most itself when it is seen and taken seriously.",
  Virgo: "Precise and useful, always noticing what could be better and offering to fix it.",
  Libra: "Relational and fairness-seeking, most itself with other people in the room.",
  Scorpio: "Intense and private. All or nothing, with little talent for the casual.",
  Sagittarius: "Restless and honest, hungry for the next horizon and a bigger frame.",
  Capricorn: "Built and ambitious. Trusts what has been earned, suspicious of ease.",
  Aquarius: "Independent and contrary, loyal to the idea more than to the usual script.",
  Pisces: "Porous and imaginative, picks up the feeling in the room before anyone speaks.",
};

export function planetMeaning(planet: string): string | undefined {
  return PLANET_MEANINGS[planet.toLowerCase() as PlanetKey];
}

export function signMeaning(sign: string): string | undefined {
  return SIGN_MEANINGS[sign as SignKey];
}
