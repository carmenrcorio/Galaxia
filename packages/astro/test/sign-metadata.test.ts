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
          const {
            symbolOrigin: _symbolOrigin,
            elementSignificance: _elementSignificance,
            metalSignificance: _metalSignificance,
            birthstoneSignificance: _birthstoneSignificance,
            ...reference
          } = getSignMetadata(sign);
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

  it("keeps every approved element significance exact", () => {
    expect(Object.fromEntries(SIGNS.map((sign) => [sign, getSignMetadata(sign).elementSignificance]))).toEqual({
      Aries: "Fire here is ignition -- the first spark, the impulse that moves before the room is ready. Aries does not sustain fire. It starts it.",
      Taurus: "Earth here is soil, not stone. Taurus builds slowly from the ground, values what grows over time, and trusts what can be held. The patience is the power.",
      Gemini: "Air here is speed -- the current that carries ideas between people before they have time to harden into opinions. Gemini's element is communication itself.",
      Cancer: "Water here is tidal -- it rises and falls with the Moon, Cancer's ruler. Emotion is not a weakness in this sign. It is the medium through which everything is understood.",
      Leo: "Fire here is sustained -- not a spark but a hearth. Leo burns steadily and visibly, warming the room by being in it. The flame wants to be seen because that is where it does its work.",
      Virgo: "Earth here is cultivated -- the field after harvest, sorted and replanted. Virgo's element is not raw nature. It is nature improved by attention.",
      Libra: "Air here is the space between two people -- the breath before a response, the pause where fairness lives. Libra's element is the medium of relationship itself.",
      Scorpio: "Water here is underground -- the aquifer, the well, the thing that runs deep and surfaces only when pressure demands it. Scorpio's element is hidden power.",
      Sagittarius: "Fire here is the torch carried into unknown territory. Sagittarius does not burn to destroy or to warm. It burns to see further.",
      Capricorn: "Earth here is the mountain -- not the soil that grows things but the structure that endures them. Capricorn's element is permanence, built one decision at a time.",
      Aquarius: "Air here is the broadcast -- the signal that reaches everyone at once. Aquarius does not whisper between two people. It transmits to the collective.",
      Pisces: "Water here has no container. It seeps, absorbs, and dissolves boundaries. Pisces does not hold water. Pisces IS water.",
    });
  });

  it("keeps every approved metal significance exact", () => {
    expect(Object.fromEntries(SIGNS.map((sign) => [sign, getSignMetadata(sign).metalSignificance]))).toEqual({
      Aries: "Iron is forged in fire and shaped by force. It is the metal of weapons and tools -- things that cut through resistance. Aries energy in mineral form.",
      Taurus: "Copper conducts warmth and beauty. It is Venus's metal -- soft enough to shape, valuable enough to keep, and it ages into something more interesting than it started.",
      Gemini: "The only metal that moves at room temperature. Mercury shifts form, refuses to be pinned, and reflects everything around it. Gemini in a droplet.",
      Cancer: "Silver is the Moon's metal -- reflective, protective, and associated with intuition across every tradition that named it. It tarnishes when neglected, like the relationships Cancer guards.",
      Leo: "Gold is the Sun's metal. It does not corrode, does not tarnish, and has been the universal symbol of worth for as long as humans have valued anything. Leo's element made permanent.",
      Virgo: "Rarer than gold, harder to work, and resistant to nearly everything. Platinum does not announce itself. It outlasts what does. Virgo's quiet superiority in metal form.",
      Libra: "Shared with Taurus through Venus. In Libra's hands, copper is the conductor of connection -- the material that carries current between two points without losing itself.",
      Scorpio: "Not a pure element but an alloy -- iron transformed by carbon under extreme heat. Steel is what iron becomes after it has been through something. Scorpio's metal is made, not found.",
      Sagittarius: "Tin is the traveler's metal -- lightweight, malleable, and historically the material of vessels that carried things across distances. Jupiter's metal moves.",
      Capricorn: "Heavy, dense, and foundational. Lead is the base metal that alchemists believed could become gold -- but only through sustained transformation. The work is the point.",
      Aquarius: "The most abundant metal on earth, yet it took centuries to isolate. Once extracted, it is light, strong, and everywhere. Aquarius builds for scale.",
      Pisces: "Shared with Virgo but read differently here. Pisces platinum is the precious thing dissolved in solution -- valuable, present, and nearly invisible until the right conditions reveal it.",
    });
  });

  it("keeps every approved birthstone significance exact", () => {
    expect(Object.fromEntries(SIGNS.map((sign) => [sign, getSignMetadata(sign).birthstoneSignificance]))).toEqual({
      Aries: "The hardest natural substance, formed under impossible pressure. Aries does not choose the easy stone. It chooses the one that nothing can scratch.",
      Taurus: "The stone of Venus -- green as the earth Taurus tends, valuable enough to hoard, and flawed in ways that make each one irreplaceable. Perfection is not the point. Rarity is.",
      Gemini: "Agate forms in layers, each one a different pattern. Cut it open and no two cross-sections match. A stone with two faces that are both real.",
      Cancer: "Named for the Moon, Cancer's ruler. Moonstone shifts color with the light -- it looks different depending on how you hold it, which is exactly how Cancer's emotions work.",
      Leo: "One of the few gemstones that comes in only one color -- green-gold, like sunlight through leaves. Leo's stone does not pretend to be anything other than what it is.",
      Virgo: "Associated with wisdom and discernment across every culture that mined it. Sapphire rewards the careful eye -- the one that can tell a real stone from glass. Virgo's test.",
      Libra: "Opal refracts every color simultaneously. It cannot commit to one wavelength, and that refusal is what makes it beautiful. Libra's stone is the argument for seeing all sides.",
      Scorpio: "Topaz was historically believed to make its wearer invisible. Whether or not that is true, the association tells you everything about what Scorpio values: power that does not need to be seen.",
      Sagittarius: "One of the oldest protection stones, carried by travelers across the Silk Road and the American Southwest. Turquoise goes where its owner goes. Sagittarius's stone is built for the road.",
      Capricorn: "Deep red, dense, and durable. Garnet is not flashy. It does not need to be. It is the stone you find in estate jewelry that outlasted the person who wore it.",
      Aquarius: "Historically believed to prevent intoxication -- the stone of clarity when everyone else is losing theirs. Aquarius does not get swept up. Amethyst is why.",
      Pisces: "The stone of the sea -- pale blue, translucent, and calming in a way that is almost chemical. Pisces's stone does not energize. It dissolves the tension until you forget it was there.",
    });
  });

  it("gives every sign a non-empty, em-dash-free significance for element, metal, and birthstone", () => {
    for (const sign of SIGNS) {
      const metadata = getSignMetadata(sign);
      for (const copy of [
        metadata.elementSignificance,
        metadata.metalSignificance,
        metadata.birthstoneSignificance,
      ]) {
        expect(copy.trim().length).toBeGreaterThan(40);
        expect(copy.includes("\u2014")).toBe(false);
      }
    }
  });
});
