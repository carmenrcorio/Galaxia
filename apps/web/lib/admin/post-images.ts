import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Lists and uploads images in the `blog-images` Storage bucket (public,
 * service-role-write-only). Called only from
 * app/api/admin/posts/images/route.ts and the /admin/posts pages, all
 * behind requireAdmin() / requireAdminApi() — this module has no guard of
 * its own, same contract as every other lib/admin/* helper.
 *
 * Uploads land at `photos/<uuid>.<ext>` inside the bucket. The bucket's
 * own allowed_mime_types / file_size_limit (see
 * supabase/migrations/20260915024600_blog_images_photo_uploads.sql) are
 * the real enforcement; the checks here fail fast with a readable message
 * instead of a raw storage-API error.
 */

export const BLOG_IMAGES_BUCKET = "blog-images";
export const BLOG_IMAGES_PHOTO_PREFIX = "photos";

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

export interface BlogImage {
  path: string;
  name: string;
  url: string;
}

function publicUrlFor(serviceRoleClient: SupabaseClient, path: string): string {
  const { data } = serviceRoleClient.storage.from(BLOG_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function collectBlogImages(
  serviceRoleClient: SupabaseClient,
  folder: string,
  out: BlogImage[],
  depth: number
): Promise<void> {
  if (depth > 3) return;
  const { data, error } = await serviceRoleClient.storage.from(BLOG_IMAGES_BUCKET).list(folder, {
    limit: 1000,
    sortBy: { column: "name", order: "asc" }
  });
  if (error) throw new Error(`listBlogImages: ${error.message}`);

  for (const item of data ?? []) {
    if (!item.name || item.name.startsWith(".")) continue;
    const path = folder ? `${folder}/${item.name}` : item.name;
    if (item.id) {
      out.push({ path, name: item.name, url: publicUrlFor(serviceRoleClient, path) });
      continue;
    }
    await collectBlogImages(serviceRoleClient, path, out, depth + 1);
  }
}

export async function listBlogImages(serviceRoleClient: SupabaseClient): Promise<BlogImage[]> {
  const out: BlogImage[] = [];
  await collectBlogImages(serviceRoleClient, "", out, 0);
  out.sort((a, b) => a.path.localeCompare(b.path));
  return out;
}

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
  const path = `${BLOG_IMAGES_PHOTO_PREFIX}/${crypto.randomUUID()}.${extension}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error } = await serviceRoleClient.storage.from(BLOG_IMAGES_BUCKET).upload(path, arrayBuffer, {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false
  });
  if (error) throw new Error(`uploadPostImage: ${error.message}`);

  return { url: publicUrlFor(serviceRoleClient, path), path };
}
