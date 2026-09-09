import "server-only";

import { createClient } from "@supabase/supabase-js";
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
 * known-in-advance vocabulary ("Guides" / "Astrology, debunked") — the
 * same reasoning `posts.category`'s CHECK constraint encodes in the
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
  status: "draft" | "published";
  readTimeMinutes: number;
  byline: string;
  /** ISO timestamp. Null for a draft that has never been published. */
  publishedAt: string | null;
  /** ISO timestamp — `updated_at`, maintained by Postgres on every row write. Used as the Article JSON-LD `dateModified`. */
  updatedAt: string;
}

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

export function getCategory(slug: string): BlogCategory | undefined {
  return BLOG_CATEGORIES.find((c) => c.slug === slug);
}

const POST_FIELDS =
  "id, slug, title, dek, category, body, hero_image_url, status, read_time_minutes, byline, published_at, updated_at";

interface PostRow {
  id: string;
  slug: string;
  title: string;
  dek: string;
  category: string;
  body: string;
  hero_image_url: string | null;
  status: string;
  read_time_minutes: number;
  byline: string;
  published_at: string | null;
  updated_at: string;
}

function toBlogPost(row: PostRow): BlogPost {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    dek: row.dek,
    category: row.category === "debunked" ? "debunked" : "guides",
    body: row.body,
    heroImageUrl: row.hero_image_url,
    status: row.status === "published" ? "published" : "draft",
    readTimeMinutes: row.read_time_minutes,
    byline: row.byline,
    publishedAt: row.published_at,
    updatedAt: row.updated_at
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
  const { data, error } = await supabase
    .from("posts")
    .select(POST_FIELDS)
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (error) throw new Error(`getPublishedPosts: ${error.message}`);
  return ((data ?? []) as PostRow[]).map(toBlogPost);
}

export async function getPublishedPostsByCategory(category: BlogCategorySlug): Promise<BlogPost[]> {
  const supabase = createPublicPostsClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("posts")
    .select(POST_FIELDS)
    .eq("status", "published")
    .eq("category", category)
    .order("published_at", { ascending: false });
  if (error) throw new Error(`getPublishedPostsByCategory: ${error.message}`);
  return ((data ?? []) as PostRow[]).map(toBlogPost);
}

export async function getPublishedPost(slug: string): Promise<BlogPost | null> {
  const supabase = createPublicPostsClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("posts")
    .select(POST_FIELDS)
    .eq("status", "published")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`getPublishedPost: ${error.message}`);
  return data ? toBlogPost(data as PostRow) : null;
}

export function formatPostDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC"
  });
}

const WORDS_PER_MINUTE = 225;

/**
 * Read time estimate from word count — computed once at save time (the
 * admin editor calls this before every create/update in
 * lib/admin/posts.ts) and stored in `posts.read_time_minutes`, never
 * derived at request/render time. Same "static estimate against the real
 * body" choice the old hand-maintained BLOG_POSTS array documented for
 * itself; only the trigger (save, not a hand-picked number) has changed.
 */
export function computeReadTimeMinutes(markdownBody: string): number {
  const words = markdownBody.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return 1;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}
