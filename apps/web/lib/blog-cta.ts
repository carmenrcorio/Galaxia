/**
 * Closing and inline calls to action for a published post.
 * Copy is founder-approved. The inline link uses the same href as that
 * post's closing button. Three sensitive posts have a closing variant and
 * no inline link.
 */

/** FOUNDER-REVIEW */
export const BLOG_BYLINE = "By Galaxia";

/** FOUNDER-REVIEW */
export const BLOG_INTRO_NOTE = "Galaxia describes what a chart shows, not what will happen.";

/** FOUNDER-REVIEW: the whole phrase, including the arrow, is the link. */
export const BLOG_INTRO_NOTE_LINK = "How we write about astrology \u2192";

export const INLINE_CTA_EXCLUDED_SLUGS = [
  "moon-square-saturn-parent-child",
  "reading-chart-of-someone-who-died",
  "colleague-you-cannot-read"
] as const;

export interface BlogClosingCta {
  heading: string;
  body: string;
  button: string;
  href: "/chart" | "/chart/compare";
}

/** FOUNDER-REVIEW */
const COMPARE_FREE: BlogClosingCta = {
  heading: "See it in your own charts",
  body: "Add two people\u2019s birth details and Galaxia calculates where their charts connect and where they catch, using astronomical positions. The comparison is free.",
  button: "Compare two charts free",
  href: "/chart/compare"
};

/** FOUNDER-REVIEW: timely and sensitive variants. Button and href match the standard closer except the memorial post. */
const CLOSING_BY_SLUG: Record<string, BlogClosingCta> = {
  "venus-retrograde-2026-relationships": {
    ...COMPARE_FREE,
    body: "Add yourself and your partner to see where Scorpio and Libra fall in each chart, and which planets Venus will touch as it moves backward."
  },
  "mercury-retrograde-relationships-2026": {
    ...COMPARE_FREE,
    body: "Add both charts to see where Scorpio falls for each of you, and which planets Mercury will retrace over."
  },
  "uranus-retrograde-gemini-2026-relationships": {
    ...COMPARE_FREE,
    body: "Add both charts to see whether Gemini touches either of you, and which of you feels it."
  },
  "moon-square-saturn-parent-child": {
    ...COMPARE_FREE,
    heading: "Look at your own family chart",
    body: "Run a synastry between you and a parent or child to see whether this square shows up between your charts."
  },
  "reading-chart-of-someone-who-died": {
    heading: "Look at their chart, gently",
    body: "Add their birth date to see their chart calculated from astronomical positions. Take it at your own pace. If you know their birth time and place, add those too for a more precise reading.",
    button: "View their chart",
    href: "/chart"
  },
  "colleague-you-cannot-read": {
    ...COMPARE_FREE,
    heading: "See where your charts connect",
    body: "Add both birth details to see where your charts flow and where they catch. It is a starting point for understanding each other, not a verdict on either of you."
  }
};

export function closingCtaForSlug(slug: string): BlogClosingCta {
  return CLOSING_BY_SLUG[slug] ?? COMPARE_FREE;
}

/** Null means this post gets no mid-article link. */
export function inlineCtaHref(slug: string): "/chart" | "/chart/compare" | null {
  if ((INLINE_CTA_EXCLUDED_SLUGS as readonly string[]).includes(slug)) return null;
  return closingCtaForSlug(slug).href;
}
