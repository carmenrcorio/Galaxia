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
  /** Why this element reads the way it does through this specific sign. */
  elementSignificance: string;
  /** Why this metal belongs to this sign. */
  metalSignificance: string;
  /** Why this stone belongs to this sign. */
  birthstoneSignificance: string;
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
    // FOUNDER-REVIEW: approved Aries element significance copy.
    elementSignificance:
      "Fire here is ignition -- the first spark, the impulse that moves before the room is ready. Aries does not sustain fire. It starts it.",
    // FOUNDER-REVIEW: approved Aries metal significance copy.
    metalSignificance:
      "Iron is forged in fire and shaped by force. It is the metal of weapons and tools -- things that cut through resistance. Aries energy in mineral form.",
    // FOUNDER-REVIEW: approved Aries birthstone significance copy.
    birthstoneSignificance:
      "The hardest natural substance, formed under impossible pressure. Aries does not choose the easy stone. It chooses the one that nothing can scratch.",
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
    // FOUNDER-REVIEW: approved Taurus element significance copy.
    elementSignificance:
      "Earth here is soil, not stone. Taurus builds slowly from the ground, values what grows over time, and trusts what can be held. The patience is the power.",
    // FOUNDER-REVIEW: approved Taurus metal significance copy.
    metalSignificance:
      "Copper conducts warmth and beauty. It is Venus's metal -- soft enough to shape, valuable enough to keep, and it ages into something more interesting than it started.",
    // FOUNDER-REVIEW: approved Taurus birthstone significance copy.
    birthstoneSignificance:
      "The stone of Venus -- green as the earth Taurus tends, valuable enough to hoard, and flawed in ways that make each one irreplaceable. Perfection is not the point. Rarity is.",
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
    // FOUNDER-REVIEW: approved Gemini element significance copy.
    elementSignificance:
      "Air here is speed -- the current that carries ideas between people before they have time to harden into opinions. Gemini's element is communication itself.",
    // FOUNDER-REVIEW: approved Gemini metal significance copy.
    metalSignificance:
      "The only metal that moves at room temperature. Mercury shifts form, refuses to be pinned, and reflects everything around it. Gemini in a droplet.",
    // FOUNDER-REVIEW: approved Gemini birthstone significance copy.
    birthstoneSignificance:
      "Agate forms in layers, each one a different pattern. Cut it open and no two cross-sections match. A stone with two faces that are both real.",
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
    // FOUNDER-REVIEW: approved Cancer element significance copy.
    elementSignificance:
      "Water here is tidal -- it rises and falls with the Moon, Cancer's ruler. Emotion is not a weakness in this sign. It is the medium through which everything is understood.",
    // FOUNDER-REVIEW: approved Cancer metal significance copy.
    metalSignificance:
      "Silver is the Moon's metal -- reflective, protective, and associated with intuition across every tradition that named it. It tarnishes when neglected, like the relationships Cancer guards.",
    // FOUNDER-REVIEW: approved Cancer birthstone significance copy.
    birthstoneSignificance:
      "Named for the Moon, Cancer's ruler. Moonstone shifts color with the light -- it looks different depending on how you hold it, which is exactly how Cancer's emotions work.",
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
    // FOUNDER-REVIEW: approved Leo element significance copy.
    elementSignificance:
      "Fire here is sustained -- not a spark but a hearth. Leo burns steadily and visibly, warming the room by being in it. The flame wants to be seen because that is where it does its work.",
    // FOUNDER-REVIEW: approved Leo metal significance copy.
    metalSignificance:
      "Gold is the Sun's metal. It does not corrode, does not tarnish, and has been the universal symbol of worth for as long as humans have valued anything. Leo's element made permanent.",
    // FOUNDER-REVIEW: approved Leo birthstone significance copy.
    birthstoneSignificance:
      "One of the few gemstones that comes in only one color -- green-gold, like sunlight through leaves. Leo's stone does not pretend to be anything other than what it is.",
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
    // FOUNDER-REVIEW: approved Virgo element significance copy.
    elementSignificance:
      "Earth here is cultivated -- the field after harvest, sorted and replanted. Virgo's element is not raw nature. It is nature improved by attention.",
    // FOUNDER-REVIEW: approved Virgo metal significance copy.
    metalSignificance:
      "Rarer than gold, harder to work, and resistant to nearly everything. Platinum does not announce itself. It outlasts what does. Virgo's quiet superiority in metal form.",
    // FOUNDER-REVIEW: approved Virgo birthstone significance copy.
    birthstoneSignificance:
      "Associated with wisdom and discernment across every culture that mined it. Sapphire rewards the careful eye -- the one that can tell a real stone from glass. Virgo's test.",
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
    // FOUNDER-REVIEW: approved Libra element significance copy.
    elementSignificance:
      "Air here is the space between two people -- the breath before a response, the pause where fairness lives. Libra's element is the medium of relationship itself.",
    // FOUNDER-REVIEW: approved Libra metal significance copy.
    metalSignificance:
      "Shared with Taurus through Venus. In Libra's hands, copper is the conductor of connection -- the material that carries current between two points without losing itself.",
    // FOUNDER-REVIEW: approved Libra birthstone significance copy.
    birthstoneSignificance:
      "Opal refracts every color simultaneously. It cannot commit to one wavelength, and that refusal is what makes it beautiful. Libra's stone is the argument for seeing all sides.",
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
    // FOUNDER-REVIEW: approved Scorpio element significance copy.
    elementSignificance:
      "Water here is underground -- the aquifer, the well, the thing that runs deep and surfaces only when pressure demands it. Scorpio's element is hidden power.",
    // FOUNDER-REVIEW: approved Scorpio metal significance copy.
    metalSignificance:
      "Not a pure element but an alloy -- iron transformed by carbon under extreme heat. Steel is what iron becomes after it has been through something. Scorpio's metal is made, not found.",
    // FOUNDER-REVIEW: approved Scorpio birthstone significance copy.
    birthstoneSignificance:
      "Topaz was historically believed to make its wearer invisible. Whether or not that is true, the association tells you everything about what Scorpio values: power that does not need to be seen.",
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
    // FOUNDER-REVIEW: approved Sagittarius element significance copy.
    elementSignificance:
      "Fire here is the torch carried into unknown territory. Sagittarius does not burn to destroy or to warm. It burns to see further.",
    // FOUNDER-REVIEW: approved Sagittarius metal significance copy.
    metalSignificance:
      "Tin is the traveler's metal -- lightweight, malleable, and historically the material of vessels that carried things across distances. Jupiter's metal moves.",
    // FOUNDER-REVIEW: approved Sagittarius birthstone significance copy.
    birthstoneSignificance:
      "One of the oldest protection stones, carried by travelers across the Silk Road and the American Southwest. Turquoise goes where its owner goes. Sagittarius's stone is built for the road.",
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
    // FOUNDER-REVIEW: approved Capricorn element significance copy.
    elementSignificance:
      "Earth here is the mountain -- not the soil that grows things but the structure that endures them. Capricorn's element is permanence, built one decision at a time.",
    // FOUNDER-REVIEW: approved Capricorn metal significance copy.
    metalSignificance:
      "Heavy, dense, and foundational. Lead is the base metal that alchemists believed could become gold -- but only through sustained transformation. The work is the point.",
    // FOUNDER-REVIEW: approved Capricorn birthstone significance copy.
    birthstoneSignificance:
      "Deep red, dense, and durable. Garnet is not flashy. It does not need to be. It is the stone you find in estate jewelry that outlasted the person who wore it.",
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
    // FOUNDER-REVIEW: approved Aquarius element significance copy.
    elementSignificance:
      "Air here is the broadcast -- the signal that reaches everyone at once. Aquarius does not whisper between two people. It transmits to the collective.",
    // FOUNDER-REVIEW: approved Aquarius metal significance copy.
    metalSignificance:
      "The most abundant metal on earth, yet it took centuries to isolate. Once extracted, it is light, strong, and everywhere. Aquarius builds for scale.",
    // FOUNDER-REVIEW: approved Aquarius birthstone significance copy.
    birthstoneSignificance:
      "Historically believed to prevent intoxication -- the stone of clarity when everyone else is losing theirs. Aquarius does not get swept up. Amethyst is why.",
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
    // FOUNDER-REVIEW: approved Pisces element significance copy.
    elementSignificance:
      "Water here has no container. It seeps, absorbs, and dissolves boundaries. Pisces does not hold water. Pisces IS water.",
    // FOUNDER-REVIEW: approved Pisces metal significance copy.
    metalSignificance:
      "Shared with Virgo but read differently here. Pisces platinum is the precious thing dissolved in solution -- valuable, present, and nearly invisible until the right conditions reveal it.",
    // FOUNDER-REVIEW: approved Pisces birthstone significance copy.
    birthstoneSignificance:
      "The stone of the sea -- pale blue, translucent, and calming in a way that is almost chemical. Pisces's stone does not energize. It dissolves the tension until you forget it was there.",
  },
};

export function getSignMetadata(sign: Sign): SignMetadata {
  return SIGN_METADATA[sign];
}
