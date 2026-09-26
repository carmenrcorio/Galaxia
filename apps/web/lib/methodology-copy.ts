import { aspectDefinition, type AspectType } from "@galaxia/astro";

/**
 * Authored copy for `/methodology`. Every user-visible string is tagged
 * FOUNDER-REVIEW (ENGINEERING.md §11). Values that come from the engine
 * (orbs, house-system names) are imported, never restated by hand.
 */

export const METHODOLOGY_PATH = "/methodology";

// FOUNDER-REVIEW
export const METHODOLOGY_TITLE = "How Galaxia Computes Your Chart";

// FOUNDER-REVIEW
export const METHODOLOGY_H1 = "How Galaxia computes your chart";

// FOUNDER-REVIEW
export const METHODOLOGY_DESCRIPTION =
  "Real astronomical data, published methodology. See the ephemeris source, orb tables, and house system behind every Galaxia chart.";

// FOUNDER-REVIEW
export const METHODOLOGY_LEDE =
  "Every chart on Galaxia is computed from real sky positions. This page publishes the method: the ephemeris, the house system, the orb table, and what we leave out.";

// FOUNDER-REVIEW
export const METHODOLOGY_OG_ALT =
  "Galaxia: astrology to understand the people in your life";

export const METHODOLOGY_SECTIONS = {
  ephemeris: {
    id: "ephemeris-source",
    // FOUNDER-REVIEW
    heading: "Ephemeris source",
    // FOUNDER-REVIEW
    paragraphs: [
      "Real astronomical positions computed from astronomy-engine, an open-source MIT library of published planetary theory, not AI-generated or looked up from a table.",
      "Positions are geocentric ecliptic longitudes in the tropical zodiac, the same frame astro.com and Cafe Astrology use. A careful reader can cross-check a chart against those sites.",
    ],
  },
  houses: {
    id: "house-system",
    // FOUNDER-REVIEW
    heading: "House system",
    // FOUNDER-REVIEW
    paragraphs: [
      "Houses are twelve rooms of a life: where a placement tends to show up. Mars in a partnership house and Mars in a work house are the same planet in different rooms.",
      "Galaxia's default is Placidus, the time-based system on astro.com and Cafe Astrology. House sizes are uneven because they follow how the sky actually rises at that latitude.",
      "You can switch to Whole Sign or Equal House in settings. Those choices are computed, not relabeled. If Placidus is undefined at a polar birth latitude, we show Whole Sign and say so.",
    ],
  },
  orbs: {
    id: "aspect-orbs",
    // FOUNDER-REVIEW
    heading: "Aspect orbs",
    // FOUNDER-REVIEW
    paragraphs: [
      "An orb is how far an angle can drift from exact and still count as that aspect. Galaxia uses one allowance per aspect type for every body. The Sun and Moon do not get a wider window than Saturn.",
    ],
    // FOUNDER-REVIEW
    tableCaption:
      "Orb allowances in degrees, used for natal aspects and synastry. The three planet columns match because the engine does not widen the window by planet class.",
    // FOUNDER-REVIEW
    columnHeaders: {
      aspect: "Aspect",
      luminaries: "Luminaries (Sun/Moon)",
      personal: "Personal planets",
      outer: "Outer planets",
    },
    // FOUNDER-REVIEW
    transitMoonNote:
      "A transiting Moon is capped at 3°, because it moves too fast for the wider natal allowance to stay meaningful.",
  },
  applying: {
    id: "applying-and-separating",
    // FOUNDER-REVIEW
    heading: "Applying and separating",
    // FOUNDER-REVIEW
    paragraphs: [
      "Applying means the exact contact is still ahead. Separating means it has already passed. Exact means the angle is already there.",
      "Galaxia computes this for transits. We estimate the UTC instant of exact contact from the transiting body's motion, then compare that instant to now. Within 0.05° of exact, or about one hour of that instant, the phase is exact.",
      "Natal and synastry aspects also mark applying or separating from each planet's longitude speed at the birth moment. If that speed is missing, the phase is left blank rather than guessed.",
    ],
  },
  omissions: {
    id: "what-we-do-not-compute",
    // FOUNDER-REVIEW
    heading: "What we do not compute",
    // FOUNDER-REVIEW
    intro:
      "We compute the Sun through Pluto, plus the Ascendant and Midheaven when birth time and place are known. We use the five major aspects (conjunction, sextile, square, trine, opposition) and the quincunx on natal and synastry charts, tropical signs, and retrograde flags. Transits, daily notes, and Vela stay on the five majors. We do not compute the rest of a professional ephemeris chart, and we do not pretend those points are present.",
    // FOUNDER-REVIEW
    items: [
      "Chiron",
      "Lunar nodes (True Node or Mean Node)",
      "Black Moon Lilith",
      "Asteroids",
      "Minor aspects other than the quincunx (semisextile, semisquare, sesquiquadrate)",
      "Arabic parts, including the Part of Fortune",
      "Vertex and midpoints",
      "Sidereal zodiac",
    ],
  },
} as const;

export const METHODOLOGY_ASPECT_TYPES: readonly AspectType[] = [
  "conjunction",
  "sextile",
  "square",
  "trine",
  "opposition",
  "quincunx",
];

// FOUNDER-REVIEW
export const METHODOLOGY_ASPECT_LABELS: Record<AspectType, string> = {
  conjunction: "Conjunction",
  sextile: "Sextile",
  square: "Square",
  trine: "Trine",
  opposition: "Opposition",
  quincunx: "Quincunx",
};

export function methodologyOrbDegrees(type: AspectType): number {
  return aspectDefinition(type).orb;
}

export function methodologyOrbRows(): Array<{
  type: AspectType;
  label: string;
  orb: number;
}> {
  return METHODOLOGY_ASPECT_TYPES.map((type) => ({
    type,
    label: METHODOLOGY_ASPECT_LABELS[type],
    orb: methodologyOrbDegrees(type),
  }));
}
