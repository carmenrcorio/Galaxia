import "server-only";

import { createClient } from "@supabase/supabase-js";
import { applyCurlyQuotes } from "./curly-quotes";
import { publicEnv } from "./env";

/**
 * Blog content model — v2 (Supabase-backed).
 *
 * v1 was a hand-maintained `BLOG_POSTS` array in this file (see git
 * history) — fine for one article, but it meant only a developer could
 * publish. This now reads real rows from the `posts` table
 * (supabase/migrations/20260909011620_blog_posts_schema_and_content.sql),
 * written through the admin editor at /admin/posts
 * (apps/web/lib/admin/posts.ts) the same way every other admin-managed
 * table in this app is written — never directly from a public route.
 *
 * `BLOG_CATEGORIES` stays a small static array on purpose: the category
 * picker in the admin editor and the tabs on /blog both need a *fixed*,
 * known-in-advance vocabulary ("Astrology guides" / "Astrology, debunked") —
 * the same reasoning `posts.category`'s CHECK constraint encodes in the
 * database. This is not "content"; it does not belong in a database table
 * an admin edits freely.
 *
 * Every public read goes through a plain anon-key client (no cookies/user
 * session needed — `posts`' RLS policy grants SELECT on published rows to
 * both `anon` and `authenticated` alike) and reads ONLY `status =
 * 'published'` rows. That filter is redundant with the RLS policy by
 * design (defense in depth: even if a query here ever forgot `.eq("status",
 * "published")`, the anon key still could not read a draft) — never rely
 * on RLS alone to justify skipping it here, and never rely on this filter
 * alone to justify a laxer policy.
 */

export type BlogCategorySlug = "guides" | "debunked";

export interface BlogCategory {
  slug: BlogCategorySlug;
  label: string;
  /** Shown on the category page when it has zero posts yet — never a fabricated post. */
  emptyNote: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  dek: string;
  category: BlogCategorySlug;
  body: string;
  heroImageUrl: string | null;
  heroImageAlt: string | null;
  figureImageUrl: string | null;
  figureImageAlt: string | null;
  figureCaption: string | null;
  figureLongDescription: string | null;
  /** Plain text of the H2 the supporting figure follows. */
  figureAfterHeading: string | null;
  status: "draft" | "published";
  readTimeMinutes: number;
  byline: string;
  /** ISO timestamp. Null for a draft that has never been published. */
  publishedAt: string | null;
  /**
   * True only when `posts.is_timely` is true. Evergreen posts (null or
   * false) hide the visible date. JSON-LD `datePublished` still uses
   * `publishedAt`.
   */
  isTimely: boolean;
  /** ISO date (`YYYY-MM-DD`) or null. Phase 3 uses this for the Timely badge. */
  expiresAt: string | null;
  /** ISO timestamp — `updated_at`, maintained by Postgres on every row write. Used as the Article JSON-LD `dateModified`. */
  updatedAt: string;
}

export const BLOG_CATEGORIES: BlogCategory[] = [
  {
    slug: "guides",
    label: "Astrology guides",
    emptyNote: "More astrology guides are on the way."
  },
  {
    slug: "debunked",
    label: "Astrology, debunked",
    emptyNote: "More on this soon. We\u2019re building out a whole category on what astrology can\u2019t actually claim."
  }
];

export function getCategory(slug: string): BlogCategory | undefined {
  return BLOG_CATEGORIES.find((c) => c.slug === slug);
}

const POST_FIELDS_BASE =
  "id, slug, title, dek, category, body, hero_image_url, hero_image_alt, figure_image_url, figure_image_alt, figure_caption, figure_long_description, figure_after_heading, status, read_time_minutes, byline, published_at, updated_at";

/** Includes Phase 1 columns. Readers fall back to POST_FIELDS_BASE if the migration is not applied yet, so a deploy cannot 500 the blog. */
const POST_FIELDS = `${POST_FIELDS_BASE}, is_timely, expires_at`;

function timelyColumnsMissing(message: string): boolean {
  return /is_timely|expires_at/i.test(message);
}

function curl(value: string | null): string | null {
  if (!value) return value;
  return applyCurlyQuotes(value);
}

interface PostRow {
  id: string;
  slug: string;
  title: string;
  dek: string;
  category: string;
  body: string;
  hero_image_url: string | null;
  hero_image_alt: string | null;
  figure_image_url: string | null;
  figure_image_alt: string | null;
  figure_caption: string | null;
  figure_long_description: string | null;
  figure_after_heading: string | null;
  status: string;
  read_time_minutes: number;
  byline: string;
  published_at: string | null;
  updated_at: string;
  is_timely?: boolean | null;
  expires_at?: string | null;
}

function toBlogPost(row: PostRow): BlogPost {
  return {
    id: row.id,
    slug: row.slug,
    title: applyCurlyQuotes(row.title),
    dek: applyCurlyQuotes(row.dek),
    category: row.category === "debunked" ? "debunked" : "guides",
    body: applyCurlyQuotes(row.body),
    heroImageUrl: row.hero_image_url,
    heroImageAlt: curl(row.hero_image_alt),
    figureImageUrl: row.figure_image_url,
    figureImageAlt: curl(row.figure_image_alt),
    figureCaption: curl(row.figure_caption),
    figureLongDescription: curl(row.figure_long_description),
    figureAfterHeading: curl(row.figure_after_heading),
    status: row.status === "published" ? "published" : "draft",
    readTimeMinutes: row.read_time_minutes,
    byline: row.byline,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    isTimely: row.is_timely === true,
    expiresAt: row.expires_at ?? null
  };
}

/**
 * A plain anon-key client with no cookie/session wiring — every consumer
 * here (blog index, category pages, the post template, sitemap.ts) is a
 * public, unauthenticated read, and sitemap.ts in particular runs as a
 * metadata route handler rather than a normal page render, where the
 * cookie-based `createSupabaseServerClient()` (lib/supabase/server.ts)
 * would tie this to a request scope it doesn't need. RLS decides what
 * this can see (published rows only), not which client constructor reads it.
 *
 * Returns null rather than a placeholder-URL client when Supabase env is
 * unset — /blog, its category pages, and each post are statically
 * prerendered (`getPublishedPost`/`getPublishedPosts` run at `next build`
 * time, not just per-request), and `createClient("", ...)` throws
 * synchronously ("supabaseUrl is required"), which aborts the whole build.
 * The rest of the public site already tolerates missing Supabase config
 * (ENGINEERING.md §6 / AGENTS.md); every caller below degrades to an empty
 * list / not-found rather than crashing, matching the same
 * `!publicEnv.supabaseUrl` guard every admin page in this app already uses.
 */
function createPublicPostsClient() {
  if (!publicEnv.supabaseUrl || !publicEnv.supabaseAnonKey) return null;
  return createClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    auth: { persistSession: false }
  });
}

export async function getPublishedPosts(): Promise<BlogPost[]> {
  const supabase = createPublicPostsClient();
  if (!supabase) return [];
  const run = (fields: string) =>
    supabase.from("posts").select(fields).eq("status", "published").order("published_at", { ascending: false });
  let { data, error } = await run(POST_FIELDS);
  if (error && timelyColumnsMissing(error.message)) {
    ({ data, error } = await run(POST_FIELDS_BASE));
  }
  if (error) throw new Error(`getPublishedPosts: ${error.message}`);
  return ((data ?? []) as unknown as PostRow[]).map(toBlogPost);
}

export async function getPublishedPostsByCategory(category: BlogCategorySlug): Promise<BlogPost[]> {
  const supabase = createPublicPostsClient();
  if (!supabase) return [];
  const run = (fields: string) =>
    supabase
      .from("posts")
      .select(fields)
      .eq("status", "published")
      .eq("category", category)
      .order("published_at", { ascending: false });
  let { data, error } = await run(POST_FIELDS);
  if (error && timelyColumnsMissing(error.message)) {
    ({ data, error } = await run(POST_FIELDS_BASE));
  }
  if (error) throw new Error(`getPublishedPostsByCategory: ${error.message}`);
  return ((data ?? []) as unknown as PostRow[]).map(toBlogPost);
}

export async function getPublishedPost(slug: string): Promise<BlogPost | null> {
  const supabase = createPublicPostsClient();
  if (!supabase) return null;
  const run = (fields: string) =>
    supabase.from("posts").select(fields).eq("status", "published").eq("slug", slug).maybeSingle();
  let { data, error } = await run(POST_FIELDS);
  if (error && timelyColumnsMissing(error.message)) {
    ({ data, error } = await run(POST_FIELDS_BASE));
  }
  if (error) throw new Error(`getPublishedPost: ${error.message}`);
  return data ? toBlogPost(data as unknown as PostRow) : null;
}

export function formatPostDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC"
  });
}

export { computeReadTimeMinutes } from "./read-time";
