/**
 * Public /learn hub copy. FOUNDER-REVIEW on user-visible strings.
 */

export const LEARN_PATH = "/learn";

// FOUNDER-REVIEW
export const LEARN_TITLE = "Learn";

// FOUNDER-REVIEW
export const LEARN_DESCRIPTION =
  "Glossary definitions, long-form guides, and how Galaxia computes charts. One place to read before you compare or ask Vela.";

// FOUNDER-REVIEW
export const LEARN_LEDE =
  "Short definitions, deeper articles, and the published method behind every placement. Pick the depth you need; each link opens its own page.";

export type LearnHubLink = {
  href: string;
  title: string;
  description: string;
};

export const LEARN_HUB_LINKS: readonly LearnHubLink[] = [
  {
    href: "/glossary",
    // FOUNDER-REVIEW
    title: "Glossary",
    description:
      "Plain definitions for natal charts, synastry, aspects, and houses. The same vocabulary used in compare and on person charts.",
  },
  {
    href: "/blog",
    // FOUNDER-REVIEW
    title: "Blog",
    description:
      "Longer guides and debunked myths. Written for people who want context, not a daily horoscope.",
  },
  {
    href: "/methodology",
    // FOUNDER-REVIEW
    title: "Methodology",
    description:
      "How Galaxia computes a chart: ephemeris, house system, orb table, and what we include or omit.",
  },
];

// FOUNDER-REVIEW
export const SETTINGS_LEARN_SECTION_TITLE = "Learn";

// FOUNDER-REVIEW
export const SETTINGS_LEARN_BLURB =
  "Definitions, guides, and how charts are computed. Open the learn hub or jump straight to the glossary.";

// FOUNDER-REVIEW
export const SETTINGS_LEARN_HUB_LABEL = "Open learn hub";

// FOUNDER-REVIEW
export const SETTINGS_GLOSSARY_LABEL = "Glossary";
