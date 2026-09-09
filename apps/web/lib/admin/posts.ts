import type { SupabaseClient } from "@supabase/supabase-js";
import { computeReadTimeMinutes, type BlogCategorySlug } from "../blog";
import { slugify } from "../slugify";

/**
 * Admin read/write for the `posts` table, mirroring `lib/admin/comp.ts` /
 * `lib/admin/list-users.ts`'s shape: takes an already-constructed
 * service-role client rather than building one from env itself, so this
 * stays directly unit-testable and imports no `server-only`. Callers
 * (the `/admin/posts` pages and `/api/admin/posts/**` route handlers) are
 * responsible for having already run `requireAdmin()` / `requireAdminApi()`
 * before calling anything here — same contract as every other admin/*
 * module.
 *
 * Unlike `comp.ts`, there is no "self" concept and no prior-value guard to
 * write against: a post has no owner, so every write here is a plain
 * read-then-write (create/update) or delete. The one invariant enforced
 * here rather than left to the database is `published_at`: it is set the
 * moment a post FIRST becomes `published` (create with status=published,
 * or an update transitioning draft -> published) and never overwritten on
 * a later edit to an already-published post — so re-saving a live post
 * (e.g. fixing a typo) does not bump its date, and un-publishing then
 * re-publishing does not either (the original `published_at` survives a
 * `draft` interval). Editing after publish is normal content maintenance,
 * not a new post.
 */

export interface AdminPostListRow {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published";
  published_at: string | null;
  created_at: string;
}

export interface AdminPostDetail {
  id: string;
  slug: string;
  title: string;
  dek: string;
  category: BlogCategorySlug;
  body: string;
  hero_image_url: string | null;
  status: "draft" | "published";
  read_time_minutes: number;
  published_at: string | null;
  created_at: string;
}

export interface PostInput {
  title: string;
  slug: string;
  dek: string;
  category: BlogCategorySlug;
  body: string;
  heroImageUrl: string | null;
  status: "draft" | "published";
}

export class PostSlugConflictError extends Error {
  constructor(slug: string) {
    super(`A post with the slug "${slug}" already exists. Choose a different slug.`);
    this.name = "PostSlugConflictError";
  }
}

export class PostNotFoundError extends Error {
  constructor(id: string) {
    super(`Post "${id}" not found.`);
    this.name = "PostNotFoundError";
  }
}

const LIST_FIELDS = "id, slug, title, status, published_at, created_at";
const DETAIL_FIELDS =
  "id, slug, title, dek, category, body, hero_image_url, status, read_time_minutes, published_at, created_at";

export async function listPostsForAdmin(serviceRoleClient: SupabaseClient): Promise<AdminPostListRow[]> {
  const { data, error } = await serviceRoleClient
    .from("posts")
    .select(LIST_FIELDS)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminPostListRow[];
}

export async function getPostForAdmin(
  serviceRoleClient: SupabaseClient,
  id: string
): Promise<AdminPostDetail | null> {
  const { data, error } = await serviceRoleClient
    .from("posts")
    .select(DETAIL_FIELDS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as AdminPostDetail | null) ?? null;
}

function normalizeInput(input: PostInput) {
  const title = input.title.trim();
  const slug = slugify(input.slug || title);
  if (!title) throw new Error("Title is required.");
  if (!slug) throw new Error("Slug is required.");
  const body = input.body ?? "";
  return {
    title,
    slug,
    dek: input.dek.trim(),
    category: input.category,
    body,
    hero_image_url: input.heroImageUrl?.trim() || null,
    status: input.status,
    read_time_minutes: computeReadTimeMinutes(body)
  };
}

/** True (Postgres unique_violation) when the write hit `posts_slug_idx`. */
function isSlugConflict(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}

export async function createPost(
  serviceRoleClient: SupabaseClient,
  input: PostInput
): Promise<AdminPostDetail> {
  const normalized = normalizeInput(input);
  const { data, error } = await serviceRoleClient
    .from("posts")
    .insert({
      ...normalized,
      published_at: normalized.status === "published" ? new Date().toISOString() : null
    })
    .select(DETAIL_FIELDS)
    .single();
  if (error) {
    if (isSlugConflict(error)) throw new PostSlugConflictError(normalized.slug);
    throw new Error(error.message);
  }
  return data as AdminPostDetail;
}

export async function updatePost(
  serviceRoleClient: SupabaseClient,
  id: string,
  input: PostInput
): Promise<AdminPostDetail> {
  const { data: existing, error: fetchError } = await serviceRoleClient
    .from("posts")
    .select("id, status, published_at")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!existing) throw new PostNotFoundError(id);

  const normalized = normalizeInput(input);
  const existingRow = existing as { status: string; published_at: string | null };
  // Only stamp published_at the first time a post goes live; an
  // already-published post keeps its original date through later edits
  // (including a draft -> published -> draft -> published round trip).
  const publishedAt =
    normalized.status === "published" ? existingRow.published_at ?? new Date().toISOString() : existingRow.published_at;

  const { data, error } = await serviceRoleClient
    .from("posts")
    .update({ ...normalized, published_at: publishedAt, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(DETAIL_FIELDS)
    .single();
  if (error) {
    if (isSlugConflict(error)) throw new PostSlugConflictError(normalized.slug);
    throw new Error(error.message);
  }
  return data as AdminPostDetail;
}

export async function deletePost(serviceRoleClient: SupabaseClient, id: string): Promise<void> {
  const { error, count } = await serviceRoleClient.from("posts").delete({ count: "exact" }).eq("id", id);
  if (error) throw new Error(error.message);
  if (!count) throw new PostNotFoundError(id);
}
