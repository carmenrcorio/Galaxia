import { describe, expect, it } from "vitest";
import { getSignMetadata, SIGN_METADATA, type Sign } from "../src/index";

const SIGNS: Sign[] = [
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
];

describe("sign metadata", () => {
  it("covers every sign with the approved reference assignments", () => {
    expect(Object.keys(SIGN_METADATA)).toEqual(SIGNS);
    expect(
      Object.fromEntries(
        SIGNS.map((sign) => {
          const { symbolOrigin: _symbolOrigin, ...reference } = getSignMetadata(sign);
          return [sign, reference];
        }),
      ),
    ).toEqual({
      Aries: { element: "fire", modality: "cardinal", symbol: "Ram", rulingPlanet: "Mars", metal: "Iron", birthstone: "Diamond" },
      Taurus: { element: "earth", modality: "fixed", symbol: "Bull", rulingPlanet: "Venus", metal: "Copper", birthstone: "Emerald" },
      Gemini: { element: "air", modality: "mutable", symbol: "Twins", rulingPlanet: "Mercury", metal: "Mercury", birthstone: "Agate" },
      Cancer: { element: "water", modality: "cardinal", symbol: "Crab", rulingPlanet: "Moon", metal: "Silver", birthstone: "Moonstone" },
      Leo: { element: "fire", modality: "fixed", symbol: "Lion", rulingPlanet: "Sun", metal: "Gold", birthstone: "Peridot" },
      Virgo: { element: "earth", modality: "mutable", symbol: "Maiden", rulingPlanet: "Mercury", metal: "Platinum", birthstone: "Sapphire" },
      Libra: { element: "air", modality: "cardinal", symbol: "Scales", rulingPlanet: "Venus", metal: "Copper", birthstone: "Opal" },
      Scorpio: { element: "water", modality: "fixed", symbol: "Scorpion", rulingPlanet: "Pluto", metal: "Steel", birthstone: "Topaz" },
      Sagittarius: { element: "fire", modality: "mutable", symbol: "Archer", rulingPlanet: "Jupiter", metal: "Tin", birthstone: "Turquoise" },
      Capricorn: { element: "earth", modality: "cardinal", symbol: "Sea-Goat", rulingPlanet: "Saturn", metal: "Lead", birthstone: "Garnet" },
      Aquarius: { element: "air", modality: "fixed", symbol: "Water-Bearer", rulingPlanet: "Uranus", metal: "Aluminum", birthstone: "Amethyst" },
      Pisces: { element: "water", modality: "mutable", symbol: "Fish", rulingPlanet: "Neptune", metal: "Platinum", birthstone: "Aquamarine" },
    });
  });

  it("keeps every approved symbol origin exact and free of em dashes", () => {
    expect(Object.fromEntries(SIGNS.map((sign) => [sign, getSignMetadata(sign).symbolOrigin]))).toEqual({
      Aries: "The ram charges first and reasons later. It is the energy that starts things -- not reckless, but unwilling to wait for permission. Every new beginning in the zodiac starts here, and that is not an accident.",
      Taurus: "The bull does not charge unless provoked. It stands its ground, builds slowly, and values what it can touch. Stubbornness is the shadow side of a deeper truth: this sign knows what it has, and it will not let go of it lightly.",
      Gemini: "Two faces, but not two-faced. The twins represent the mind in conversation with itself -- the part of you that sees both sides before the rest of the room sees one. Speed is the gift. Stillness is the homework.",
      Cancer: "The crab carries its home on its back. That is not weakness; it is architecture. Cancer builds safety wherever it goes, and the shell is not hiding -- it is protecting something soft enough to feel everything.",
      Leo: "The lion does not perform for approval. It performs because the light is where it belongs. Leo's reputation for ego misses the deeper point: this sign believes that being seen fully -- flaws and all -- is an act of courage, not vanity.",
      Virgo: "The maiden is not about purity. Older traditions show her holding a sheaf of wheat -- she is the harvester, the one who separates what is useful from what is not. Virgo sees the flaw because Virgo is already designing the fix.",
      Libra: "The scales are not about balance as a personality trait. They are about the constant act of weighing -- every side, every angle, every person's perspective -- before committing. Libra's indecision is not weakness. It is the refusal to be unfair.",
      Scorpio: "The scorpion is the surface symbol. Older traditions use the eagle or the phoenix. All three share one trait: transformation through intensity. Something has to burn before it rises. Scorpio does not fear the fire because Scorpio has already been through it.",
      Sagittarius: "The archer aims at what it cannot yet see. This is the sign that believes the truth is out there -- past the border, past the assumption, past the thing everyone agreed to stop questioning. Restlessness is not the flaw. Settling for less than honest is.",
      Capricorn: "The sea-goat -- half goat, half fish -- is one of the oldest symbols in astrology. It climbs relentlessly but its tail remembers the depth it came from. Ambition rooted in emotional understanding. Capricorn does not climb to escape. It climbs because the view from the top is where it can finally see clearly.",
      Aquarius: "Not water the element -- water as something carried and poured for others. The water-bearer holds knowledge, systems, and futures, and distributes them without asking who deserves it. Aquarius is not detached. It is operating at a scale where personal attachment would slow down what needs to reach everyone.",
      Pisces: "Two fish swimming in opposite directions, tethered together. One swims toward the material world, the other toward the unseen. Pisces lives in both at once, which is why it absorbs everything and why boundaries are the lifelong work. The gift is empathy so deep it borders on telepathy. The cost is never fully belonging to either world.",
    });

    expect(SIGNS.every((sign) => !getSignMetadata(sign).symbolOrigin.includes("\u2014"))).toBe(true);
  });
});
