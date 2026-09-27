import type { Sign } from "./index";

export type SignElement = "fire" | "earth" | "air" | "water";
export type SignModality = "cardinal" | "fixed" | "mutable";

export interface SignMetadata {
  element: SignElement;
  modality: SignModality;
  symbol: string;
  symbolOrigin: string;
  rulingPlanet: string;
  metal: string;
  birthstone: string;
}

export const SIGN_METADATA: Readonly<Record<Sign, SignMetadata>> = {
  Aries: {
    element: "fire",
    modality: "cardinal",
    symbol: "Ram",
    // FOUNDER-REVIEW: approved Aries symbol-origin copy.
    symbolOrigin:
      "The ram charges first and reasons later. It is the energy that starts things -- not reckless, but unwilling to wait for permission. Every new beginning in the zodiac starts here, and that is not an accident.",
    rulingPlanet: "Mars",
    metal: "Iron",
    birthstone: "Diamond",
  },
  Taurus: {
    element: "earth",
    modality: "fixed",
    symbol: "Bull",
    // FOUNDER-REVIEW: approved Taurus symbol-origin copy.
    symbolOrigin:
      "The bull does not charge unless provoked. It stands its ground, builds slowly, and values what it can touch. Stubbornness is the shadow side of a deeper truth: this sign knows what it has, and it will not let go of it lightly.",
    rulingPlanet: "Venus",
    metal: "Copper",
    birthstone: "Emerald",
  },
  Gemini: {
    element: "air",
    modality: "mutable",
    symbol: "Twins",
    // FOUNDER-REVIEW: approved Gemini symbol-origin copy.
    symbolOrigin:
      "Two faces, but not two-faced. The twins represent the mind in conversation with itself -- the part of you that sees both sides before the rest of the room sees one. Speed is the gift. Stillness is the homework.",
    rulingPlanet: "Mercury",
    metal: "Mercury",
    birthstone: "Agate",
  },
  Cancer: {
    element: "water",
    modality: "cardinal",
    symbol: "Crab",
    // FOUNDER-REVIEW: approved Cancer symbol-origin copy.
    symbolOrigin:
      "The crab carries its home on its back. That is not weakness; it is architecture. Cancer builds safety wherever it goes, and the shell is not hiding -- it is protecting something soft enough to feel everything.",
    rulingPlanet: "Moon",
    metal: "Silver",
    birthstone: "Moonstone",
  },
  Leo: {
    element: "fire",
    modality: "fixed",
    symbol: "Lion",
    // FOUNDER-REVIEW: approved Leo symbol-origin copy.
    symbolOrigin:
      "The lion does not perform for approval. It performs because the light is where it belongs. Leo's reputation for ego misses the deeper point: this sign believes that being seen fully -- flaws and all -- is an act of courage, not vanity.",
    rulingPlanet: "Sun",
    metal: "Gold",
    birthstone: "Peridot",
  },
  Virgo: {
    element: "earth",
    modality: "mutable",
    symbol: "Maiden",
    // FOUNDER-REVIEW: approved Virgo symbol-origin copy.
    symbolOrigin:
      "The maiden is not about purity. Older traditions show her holding a sheaf of wheat -- she is the harvester, the one who separates what is useful from what is not. Virgo sees the flaw because Virgo is already designing the fix.",
    rulingPlanet: "Mercury",
    metal: "Platinum",
    birthstone: "Sapphire",
  },
  Libra: {
    element: "air",
    modality: "cardinal",
    symbol: "Scales",
    // FOUNDER-REVIEW: approved Libra symbol-origin copy.
    symbolOrigin:
      "The scales are not about balance as a personality trait. They are about the constant act of weighing -- every side, every angle, every person's perspective -- before committing. Libra's indecision is not weakness. It is the refusal to be unfair.",
    rulingPlanet: "Venus",
    metal: "Copper",
    birthstone: "Opal",
  },
  Scorpio: {
    element: "water",
    modality: "fixed",
    symbol: "Scorpion",
    // FOUNDER-REVIEW: approved Scorpio symbol-origin copy.
    symbolOrigin:
      "The scorpion is the surface symbol. Older traditions use the eagle or the phoenix. All three share one trait: transformation through intensity. Something has to burn before it rises. Scorpio does not fear the fire because Scorpio has already been through it.",
    rulingPlanet: "Pluto",
    metal: "Steel",
    birthstone: "Topaz",
  },
  Sagittarius: {
    element: "fire",
    modality: "mutable",
    symbol: "Archer",
    // FOUNDER-REVIEW: approved Sagittarius symbol-origin copy.
    symbolOrigin:
      "The archer aims at what it cannot yet see. This is the sign that believes the truth is out there -- past the border, past the assumption, past the thing everyone agreed to stop questioning. Restlessness is not the flaw. Settling for less than honest is.",
    rulingPlanet: "Jupiter",
    metal: "Tin",
    birthstone: "Turquoise",
  },
  Capricorn: {
    element: "earth",
    modality: "cardinal",
    symbol: "Sea-Goat",
    // FOUNDER-REVIEW: approved Capricorn symbol-origin copy.
    symbolOrigin:
      "The sea-goat -- half goat, half fish -- is one of the oldest symbols in astrology. It climbs relentlessly but its tail remembers the depth it came from. Ambition rooted in emotional understanding. Capricorn does not climb to escape. It climbs because the view from the top is where it can finally see clearly.",
    rulingPlanet: "Saturn",
    metal: "Lead",
    birthstone: "Garnet",
  },
  Aquarius: {
    element: "air",
    modality: "fixed",
    symbol: "Water-Bearer",
    // FOUNDER-REVIEW: approved Aquarius symbol-origin copy.
    symbolOrigin:
      "Not water the element -- water as something carried and poured for others. The water-bearer holds knowledge, systems, and futures, and distributes them without asking who deserves it. Aquarius is not detached. It is operating at a scale where personal attachment would slow down what needs to reach everyone.",
    rulingPlanet: "Uranus",
    metal: "Aluminum",
    birthstone: "Amethyst",
  },
  Pisces: {
    element: "water",
    modality: "mutable",
    symbol: "Fish",
    // FOUNDER-REVIEW: approved Pisces symbol-origin copy.
    symbolOrigin:
      "Two fish swimming in opposite directions, tethered together. One swims toward the material world, the other toward the unseen. Pisces lives in both at once, which is why it absorbs everything and why boundaries are the lifelong work. The gift is empathy so deep it borders on telepathy. The cost is never fully belonging to either world.",
    rulingPlanet: "Neptune",
    metal: "Platinum",
    birthstone: "Aquamarine",
  },
};

export function getSignMetadata(sign: Sign): SignMetadata {
  return SIGN_METADATA[sign];
}
