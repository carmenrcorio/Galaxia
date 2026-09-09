/**
 * Blog content model — v1.
 *
 * Deliberately not a CMS: this is a hand-maintained array of post metadata
 * that both `/blog` (the index) and each post's own `app/<slug>/page.tsx`
 * read from, so the two never drift (same pattern as `FAQS` in
 * marketing/faq-section.tsx — an inline config array, not a database). When
 * there's enough post volume to justify a CMS, this is the seam to swap it
 * out at; every consumer already goes through `getPost` / `getPostsByCategory`
 * rather than importing `BLOG_POSTS` directly.
 *
 * Read time is a static estimate (word count of the actual article body ÷
 * ~225 wpm), not computed at request time — these are hand-authored JSX
 * pages, not markdown, so there's no single source string to count against
 * at build time without parsing the rendered tree.
 */

export type BlogCategorySlug = "guides" | "debunked";

export interface BlogCategory {
  slug: BlogCategorySlug;
  label: string;
  /** Shown on the category page when it has zero posts yet — never a fabricated post. */
  emptyNote: string;
}

export interface BlogPostSection {
  id: string;
  label: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  dek: string;
  /** ISO date (YYYY-MM-DD) — the real merge date of the post's PR, not an estimate. */
  date: string;
  category: BlogCategorySlug;
  readTimeMinutes: number;
  byline: string;
  /** H2 sections (id must match the heading's actual `id` in the post JSX), for the table of contents. */
  sections: BlogPostSection[];
}

/** Posts with at least this many sections get an anchored table of contents. */
export const TOC_SECTION_THRESHOLD = 4;

export const BLOG_CATEGORIES: BlogCategory[] = [
  {
    slug: "guides",
    label: "Guides",
    emptyNote: "More guides are on the way."
  },
  {
    slug: "debunked",
    label: "Astrology, debunked",
    emptyNote: "More on this soon — we're building out a whole category on what astrology can't actually claim."
  }
];

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "synastry-chart-meaning",
    title: "What a Synastry Chart Actually Tells You About Your Relationship",
    dek: "Not a compatibility score. A synastry chart maps where two people flow easily and where they reliably catch — and what to do about each.",
    // Actual merge date of the article (PR #157), not a guess.
    date: "2026-09-08",
    category: "guides",
    readTimeMinutes: 6,
    byline: "The Galaxia Team",
    sections: [
      { id: "what-it-is", label: "What a synastry chart is, in two minutes" },
      { id: "flows-and-catches", label: "The only distinction that matters: flows and catches" },
      { id: "why-ease-is-dangerous", label: "Why the easy parts are the dangerous ones" },
      { id: "reading-the-catches", label: "Reading the catches without building a case" },
      { id: "what-a-chart-cannot-tell-you", label: "What a chart cannot tell you" },
      { id: "reading-yours", label: "Reading yours" }
    ]
  }
];

export function getCategory(slug: string): BlogCategory | undefined {
  return BLOG_CATEGORIES.find((c) => c.slug === slug);
}

export function getPostsByCategory(slug: BlogCategorySlug): BlogPost[] {
  return BLOG_POSTS.filter((p) => p.category === slug);
}

export function getPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function formatPostDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC"
  });
}
