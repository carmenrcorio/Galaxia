/**
 * Closing and intro calls to action for a published post.
 * Copy is founder-approved. Three sensitive posts have no mid-newsletter slot.
 */

import type { BlogCategorySlug } from "./blog";

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

export type BlogCtaHref = "/chart" | "/chart/compare" | "/generations";

export interface BlogClosingCta {
  heading: string;
  body: string;
  button: string;
  href: BlogCtaHref;
}

export interface BlogIntroCta {
  body: string;
  button: string;
  href: BlogCtaHref;
}

const MEMORIAL_SLUGS = new Set(["reading-chart-of-someone-who-died"]);

/** FOUNDER-REVIEW */
export function postCtaHref(slug: string, _category?: BlogCategorySlug): BlogCtaHref {
  if (slug === "nobody-has-your-grandmother") return "/generations";
  if (MEMORIAL_SLUGS.has(slug)) return "/chart";
  if (slug.includes("synastry")) return "/chart/compare";
  return "/chart";
}

/** FOUNDER-REVIEW */
export function introCtaForSlug(slug: string, category: BlogCategorySlug): BlogIntroCta {
  const href = postCtaHref(slug, category);
  if (href === "/generations") {
    return {
      body: "Add your family to one constellation and see how generations overlap.",
      button: "Map your family free for 14 days",
      href
    };
  }
  if (href === "/chart/compare") {
    return {
      body: "Add two birth dates and see where your charts flow and where they catch.",
      button: "Compare two charts free",
      href
    };
  }
  return {
    body: "Enter a birth date and see placements computed from the sky, free in about 60 seconds.",
    button: "See your own chart in 60 seconds, free",
    href
  };
}

/** FOUNDER-REVIEW */
const COMPARE_FREE: BlogClosingCta = {
  heading: "See it in your own charts",
  body: "Add two people\u2019s birth details and Galaxia calculates where their charts connect and where they catch, using astronomical positions. The comparison is free.",
  button: "Compare two charts free",
  href: "/chart/compare"
};

/** FOUNDER-REVIEW */
const CHART_FREE: BlogClosingCta = {
  heading: "See it in your own chart",
  body: "Add a birth date and Galaxia calculates placements from astronomical positions. No signup required to run a chart.",
  button: "Run your free chart",
  href: "/chart"
};

/** FOUNDER-REVIEW */
const GENERATIONS_CLOSE: BlogClosingCta = {
  heading: "Chart everyone who matters",
  body: "Add parents, siblings, and the people you have lost. Galaxia maps how generations overlap in one place.",
  button: "Add your family free for 14 days",
  href: "/generations"
};

/** FOUNDER-REVIEW: timely and sensitive variants. */
const CLOSING_BY_SLUG: Record<string, Partial<BlogClosingCta>> = {
  "venus-retrograde-2026-relationships": {
    body: "Add yourself and your partner to see where Scorpio and Libra fall in each chart, and which planets Venus will touch as it moves backward."
  },
  "mercury-retrograde-relationships-2026": {
    body: "Add both charts to see where Scorpio falls for each of you, and which planets Mercury will retrace over."
  },
  "uranus-retrograde-gemini-2026-relationships": {
    body: "Add both charts to see whether Gemini touches either of you, and which of you feels it."
  },
  "moon-square-saturn-parent-child": {
    heading: "Look at your own family chart",
    body: "Run a synastry between you and a parent or child to see whether this square shows up between your charts."
  },
  "reading-chart-of-someone-who-died": {
    heading: "Look at their chart, gently",
    body: "Add their birth date to see their chart calculated from astronomical positions. Take it at your own pace.",
    button: "View their chart",
    href: "/chart"
  },
  "colleague-you-cannot-read": {
    heading: "See where your charts connect",
    body: "Add both birth details to see where your charts flow and where they catch. It is a starting point for understanding each other, not a verdict on either of you."
  }
};

function closingBaseForHref(href: BlogCtaHref): BlogClosingCta {
  if (href === "/generations") return { ...GENERATIONS_CLOSE };
  if (href === "/chart/compare") return { ...COMPARE_FREE };
  return { ...CHART_FREE };
}

export function closingCtaForSlug(slug: string, category: BlogCategorySlug = "guides"): BlogClosingCta {
  const href = postCtaHref(slug, category);
  const base = closingBaseForHref(href);
  const override = CLOSING_BY_SLUG[slug];
  if (!override) return base;
  return {
    ...base,
    ...override,
    href: override.href ?? href
  };
}

/** Null means this post gets no mid-article newsletter slot. */
export function showMidNewsletter(slug: string): boolean {
  return !(INLINE_CTA_EXCLUDED_SLUGS as readonly string[]).includes(slug);
}

/** @deprecated Use postCtaHref; kept for tests migrating off inline link CTAs. */
export function inlineCtaHref(slug: string, category: BlogCategorySlug = "guides"): BlogCtaHref | null {
  if (!showMidNewsletter(slug)) return null;
  return postCtaHref(slug, category);
}
