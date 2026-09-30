/**
 * Blog index presentation. Plain data and pure helpers so cards, the index,
 * and click tracking can share one config without importing the server-only
 * posts client.
 *
 * Remove a slug from TITLE_HERO_PLACEHOLDER_SLUGS only after its
 * hero_image_url is a local image (a path starting with /) and that image
 * has no title text. A remote hero, including a title-on-starfield SVG in
 * the blog-images bucket, still uses the placeholder after the slug is
 * removed, so the title artwork cannot come back onto a card.
 */

/** FOUNDER-REVIEW: index lede. Birth chart is the term. */
export const BLOG_INDEX_LEDE =
  "Birth charts, synastry, generations, and what astrology can and cannot claim. Starting with the people already in your life.";

/** FOUNDER-REVIEW */
export const BLOG_START_HERE_TITLE = "Start here";

/** FOUNDER-REVIEW */
export const BLOG_START_HERE_INTRO =
  "Three evergreen guides on synastry, the Sun sign, and the Moon.";

/** FOUNDER-REVIEW */
export const BLOG_TIMELY_BADGE = "Timely";

export const BLOG_CARD_PLACEHOLDER_SRC = "/blog/constellation-placeholder.png";

/**
 * Older posts whose stored hero is a title-on-starfield SVG. One slug per
 * line so a replacement can be removed on its own.
 */
export const TITLE_HERO_PLACEHOLDER_SLUGS = [
  "compatibility-scores-wrong-question",
  "reading-chart-of-someone-who-died",
  "synastry-aspects-explained",
  "sun-sign-not-personality",
  "what-a-chart-cannot-tell-you",
  "nobody-has-your-grandmother",
  "moon-square-saturn-parent-child",
  "synastry-chart-meaning",
  "colleague-you-cannot-read",
  "mothers-moon-sign-apology"
] as const;

/** Evergreen only. A post that is timely right now is left out of this row. */
export const START_HERE_SLUGS = [
  "synastry-chart-meaning",
  "sun-sign-not-personality",
  "moon-sign-in-relationships"
] as const;

export const BLOG_ANALYTICS = {
  startHere: "blog_start_here_click",
  card: "blog_card_click",
  readNext: "blog_read_next_click",
  cta: "blog_cta_click"
} as const;

export type BlogAnalyticsEvent = (typeof BLOG_ANALYTICS)[keyof typeof BLOG_ANALYTICS];

/** Which call to action was clicked. No other properties are sent. */
export type BlogCtaKind = "inline" | "closing";

export interface BlogIndexFields {
  slug: string;
  isTimely: boolean;
  expiresAt: string | null;
  publishedAt: string | null;
  heroImageUrl: string | null;
}

/** UTC calendar day, YYYY-MM-DD. The badge is off on expires_at itself. */
export function utcCalendarDate(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function isTimelyActive(
  post: { isTimely: boolean; expiresAt: string | null },
  now: Date = new Date()
): boolean {
  if (!post.isTimely || !post.expiresAt) return false;
  const expires = post.expiresAt.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expires)) return false;
  return utcCalendarDate(now) < expires;
}

export function cardThumbnailSrc(slug: string, heroImageUrl: string | null): string | null {
  if ((TITLE_HERO_PLACEHOLDER_SLUGS as readonly string[]).includes(slug)) {
    return BLOG_CARD_PLACEHOLDER_SRC;
  }
  if (!heroImageUrl) return null;
  if (!heroImageUrl.startsWith("/")) return BLOG_CARD_PLACEHOLDER_SRC;
  return heroImageUrl;
}

function byPublishedDesc<T extends { publishedAt: string | null }>(a: T, b: T): number {
  const aTime = a.publishedAt ? Date.parse(a.publishedAt) : 0;
  const bTime = b.publishedAt ? Date.parse(b.publishedAt) : 0;
  if (aTime === bTime) return 0;
  return bTime - aTime;
}

/** Timely posts that have not expired, then everything else newest first. */
export function sortBlogFeed<T extends BlogIndexFields>(posts: T[], now: Date = new Date()): T[] {
  const timely: T[] = [];
  const rest: T[] = [];
  for (const post of posts) {
    if (isTimelyActive(post, now)) timely.push(post);
    else rest.push(post);
  }
  return [...timely.sort(byPublishedDesc), ...rest.sort(byPublishedDesc)];
}

/**
 * Start here, in config order, then the remaining posts. A configured slug
 * that is missing or currently timely is skipped, never invented.
 */
export function partitionBlogIndex<T extends BlogIndexFields>(
  posts: T[],
  now: Date = new Date()
): { startHere: T[]; rest: T[] } {
  const bySlug = new Map(posts.map((post) => [post.slug, post]));
  const used = new Set<string>();
  const startHere: T[] = [];
  for (const slug of START_HERE_SLUGS) {
    const post = bySlug.get(slug);
    if (!post || isTimelyActive(post, now)) continue;
    startHere.push(post);
    used.add(slug);
  }
  return {
    startHere,
    rest: sortBlogFeed(
      posts.filter((post) => !used.has(post.slug)),
      now
    )
  };
}
