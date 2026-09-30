/**
 * /method, the publication's one statement of how Galaxia handles astrology.
 * Engine numbers stay on /methodology so this page cannot drift from the orb table.
 *
 * FOUNDER-REVIEW: the brief asked this page to say houses are calculated in
 * Whole Sign. The app default is Placidus (see methodology-copy.ts). This
 * page follows the engine. Whole Sign is a settings choice and the polar fallback.
 * FOUNDER-REVIEW: "written ahead of time" describes the curated interpretation
 * library. Confirm Vela never answers past that library.
 */

export const METHOD_PATH = "/method";

/** FOUNDER-REVIEW */
export const METHOD_TITLE = "How Galaxia Handles Astrology in Charts and Houses";

/** FOUNDER-REVIEW */
export const METHOD_DESCRIPTION =
  "Birth charts here describe how someone is built. They do not predict what will happen. Here is the house system, the written copy, and the limits.";

/** FOUNDER-REVIEW */
export const METHOD_H1 = "How Galaxia handles astrology";

/** FOUNDER-REVIEW */
/** FOUNDER-REVIEW */
export const METHOD_LEDE_BEFORE_LINK =
  "This is the short version of how we write about astrology. The calculation details, including the ephemeris and the orb table, are on the ";
export const METHOD_LEDE_LINK_LABEL = "methodology page";

export const METHOD_SECTIONS = [
  {
    id: "descriptions",
    // FOUNDER-REVIEW
    heading: "Descriptions, not predictions",
    paragraphs: [
      "A birth chart describes how someone is built. It does not predict what they will do, whom they will choose, or how a relationship will end.",
      "Natal chart means the same thing as birth chart. Birth chart is the term we use."
    ]
  },
  {
    id: "copy",
    // FOUNDER-REVIEW
    heading: "The words are written ahead of time",
    paragraphs: [
      "Interpretation copy in Galaxia is written and stored before anyone opens the app. A reading pulls that copy. It does not invent a new prediction for the person in front of it."
    ]
  },
  {
    id: "can",
    // FOUNDER-REVIEW
    heading: "What a chart can show",
    paragraphs: [
      "Signs, planets, aspects, and houses can describe tendencies. That includes how someone tends to feel safe, where two people tend to catch, and which part of life a placement points at."
    ]
  },
  {
    id: "cannot",
    // FOUNDER-REVIEW
    heading: "What a chart cannot show",
    paragraphs: [
      "It cannot tell you whether to stay, who was at fault, what someone who has died would say now, or what will happen next month."
    ]
  },
  {
    id: "houses",
    // FOUNDER-REVIEW
    heading: "How houses are calculated",
    paragraphs: [
      "Galaxia\u2019s default house system is Placidus. You can switch to Whole Sign or Equal House in settings. If Placidus is undefined at a polar birth latitude, we show Whole Sign and say so."
    ]
  }
] as const;
