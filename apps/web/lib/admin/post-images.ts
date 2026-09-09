import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Uploads one hero/inline post image to the `post-images` Storage bucket
 * (created public, service-role-write-only — see
 * supabase/migrations/20260909011620_blog_posts_schema_and_content.sql)
 * and returns its public URL. Called only from
 * app/api/admin/posts/images/route.ts, itself behind `requireAdminApi()` —
 * this module has no guard of its own, same contract as `lib/admin/*`.
 *
 * The bucket's own `allowed_mime_types`/`file_size_limit` (set in the
 * migration) are the real enforcement; the checks here exist to fail fast
 * with a readable message instead of a raw storage-API error.
 */

const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_BYTES = 8 * 1024 * 1024;

export class InvalidPostImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPostImageError";
  }
}

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif"
};

export async function uploadPostImage(
  serviceRoleClient: SupabaseClient,
  file: File
): Promise<{ url: string; path: string }> {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new InvalidPostImageError(`Unsupported image type "${file.type}". Use PNG, JPEG, WebP, or GIF.`);
  }
  if (file.size > MAX_BYTES) {
    throw new InvalidPostImageError("Image is larger than 8 MB. Please resize and try again.");
  }

  const extension = EXTENSION_BY_MIME[file.type] ?? "bin";
  const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error } = await serviceRoleClient.storage.from("post-images").upload(path, arrayBuffer, {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false
  });
  if (error) throw new Error(`uploadPostImage: ${error.message}`);

  const { data } = serviceRoleClient.storage.from("post-images").getPublicUrl(path);
  return { url: data.publicUrl, path };
}
