import {
  aspectDefinition,
  natalAspectCoverage,
  type AspectType,
} from "@galaxia/astro";

/**
 * Authored copy for `/methodology`. Every user-visible string is tagged
 * FOUNDER-REVIEW (ENGINEERING.md §11). Values that come from the engine
 * (orbs, house-system names, natal aspect coverage counts) are imported,
 * never restated by hand.
 *
 * PLACEHOLDER_PRACTITIONER_CREDIT: When a named practitioner credit is approved
 * for public display, add it here (or adjacent review-statement module).
 */

export const METHODOLOGY_PATH = "/methodology";

// FOUNDER-REVIEW
export const METHODOLOGY_TITLE = "How Galaxia Computes Your Chart";

// FOUNDER-REVIEW
export const METHODOLOGY_H1 = "How Galaxia computes your chart";

// FOUNDER-REVIEW
export const METHODOLOGY_DESCRIPTION =
  "Real astronomical data, published methodology. See the ephemeris source, orb table, house system, precision tiers, written readings, and Vela behind every Galaxia chart.";

// FOUNDER-REVIEW
export const METHODOLOGY_LEDE =
  "Every chart on Galaxia is computed from real sky positions. This page publishes the method: what we calculate, what we omit, how orbs work, how birth precision limits the chart, and how written readings differ from Vela.";

// FOUNDER-REVIEW
export const METHODOLOGY_OG_ALT =
  "Galaxia: astrology to understand the people in your life";

/** Short link line near signup and chart entry forms. */
// FOUNDER-REVIEW
export const METHODOLOGY_FORM_LINK_BEFORE = "How we compute charts: ";
// FOUNDER-REVIEW
export const METHODOLOGY_FORM_LINK_LABEL = "methodology";

/** One-sentence limits on signup and public compare (helper-text). */
// FOUNDER-REVIEW
export const METHODOLOGY_SIGNUP_LIMITS_LINE =
  "A birth chart describes how someone is built, not what will happen next, and without a birth time Galaxia will not show a Rising sign or houses.";

// FOUNDER-REVIEW
export const METHODOLOGY_COMPARE_LIMITS_LINE =
  "Synastry describes patterns between two charts; it cannot tell you whether to stay or who was at fault.";

export const METHODOLOGY_SECTIONS = {
  limits: {
    id: "limits",
    // FOUNDER-REVIEW
    heading: "What a chart can and cannot do",
    // FOUNDER-REVIEW
    paragraphs: [
      "A birth chart describes how someone is built. It does not predict events, choices, or outcomes.",
      "It cannot tell you whether to stay in a relationship, who was at fault, or what will happen next month.",
      "Without a birth time, a Rising sign and house placements cannot be computed honestly, and Galaxia will not invent them.",
    ],
  },
  precision: {
    id: "birth-precision",
    // FOUNDER-REVIEW
    heading: "Birth precision",
    // FOUNDER-REVIEW
    paragraphs: [
      "Year-only charts compute the Sun and the outer planets Uranus, Neptune, and Pluto only. Inner planets and the True Node are omitted because their signs depend on a day we do not know. Natal aspects are not computed for year-only data.",
      "Date-only charts compute the standard set of bodies at noon UTC on that calendar date. Houses, the Ascendant, and the Midheaven are not shown because birth time and place are missing.",
      "Exact charts use local birth time converted to UTC with the birth place timezone. Houses and angles are computed only when latitude and longitude are known.",
    ],
  },
  ephemeris: {
    id: "ephemeris-source",
    // FOUNDER-REVIEW
    heading: "Ephemeris source",
    // FOUNDER-REVIEW
    paragraphs: [
      "Sun through Pluto use astronomy-engine, an open-source MIT library of published planetary theory. Positions are geocentric ecliptic longitudes in the tropical zodiac, not AI-generated.",
      "The True Node is computed on date-only and exact charts from the geocentric Moon state (osculating node). Mean Node is not computed.",
      "Chiron is computed when the birth date falls in the 1900 through 2101 range covered by our table. Positions come from JPL Horizons samples with ten-day linear interpolation, not from astronomy-engine. Chiron currently has no written reading in the app; it is computed only.",
    ],
  },
  houses: {
    id: "house-system",
    // FOUNDER-REVIEW
    heading: "House system",
    // FOUNDER-REVIEW
    paragraphs: [
      "Houses are twelve life arenas: where a placement tends to show up. Mars in a partnership house and Mars in a work house are the same planet in different rooms.",
      "Galaxia's default is Placidus, the time-based system used on many reference chart sites. House sizes are uneven because they follow how the sky rises at that latitude.",
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
      "Orb allowances in degrees for natal aspects and synastry. The same orb applies to every planet pair.",
    // FOUNDER-REVIEW
    columnHeaders: {
      aspect: "Aspect",
      orb: "Orb (°)",
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
  readings: {
    id: "how-readings-are-written",
    // FOUNDER-REVIEW
    heading: "How readings are written",
    // FOUNDER-REVIEW
    intro:
      "Placement and aspect copy is written in advance and stored in the codebase before anyone opens the app. A reading pulls that stored copy; it is not generated on the fly for each person.",
    // FOUNDER-REVIEW
    founderReview:
      "Each reading is reviewed and approved by the founder before it ships.",
    // FOUNDER-REVIEW
    coverageNote:
      "Not every natal aspect pair has a written reading. Pairs we have not authored are not shown rather than filled in with generic text.",
  },
  vela: {
    id: "what-vela-does",
    // FOUNDER-REVIEW
    heading: "What Vela does",
    // FOUNDER-REVIEW
    paragraphs: [
      "Vela is the in-app guide powered by Anthropic's Claude. Its replies are generated, unlike the written readings above.",
      "Vela receives computed chart facts and a list of aspects from your stored charts. It is instructed to name only aspects from that list, never to invent placements, and not to predict the future.",
      "Vela can be wrong or incomplete like any AI. Treat it as guidance grounded in your chart data, not as a final authority.",
    ],
  },
  accuracy: {
    id: "accuracy-checks",
    // FOUNDER-REVIEW
    heading: "What we test against",
    // FOUNDER-REVIEW
    paragraphs: [
      "House cusp calculation is checked against a published Placidus reference chart to within about one arcminute. We do not claim a universal match to every external ephemeris for every chart.",
    ],
  },
  omissions: {
    id: "what-we-do-not-compute",
    // FOUNDER-REVIEW
    heading: "What we do not compute",
    // FOUNDER-REVIEW
    intro:
      "We compute the Sun through Pluto, the True Node on date and exact charts, and Chiron when our table covers the date. We use the five major aspects plus the quincunx on natal and synastry charts, tropical signs, and retrograde flags. Transits, daily notes, and Vela aspect lists stay on the five majors. We do not compute the rest of a professional ephemeris chart, and we do not pretend those points are present.",
    // FOUNDER-REVIEW
    items: [
      "Mean Node",
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

/** Natal pair reading counts from the engine (cannot drift from interpretations.ts). */
export function methodologyNatalAspectCoverageSentence(): string {
  const { authored, possible } = natalAspectCoverage();
  return `Today ${authored} of ${possible} possible natal aspect pairs have a written reading in the library.`;
}
