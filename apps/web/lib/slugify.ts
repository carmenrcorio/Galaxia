/**
 * Plain slug generation — no "server-only" import (unlike lib/blog.ts and
 * lib/admin/posts.ts) so the client-side post editor
 * (components/admin/post-editor-form.tsx) can preview a slug as the admin
 * types a title, using the exact same rule the server applies when it
 * actually writes the row (lib/admin/posts.ts). Never trust the client's
 * copy of this as the source of truth for uniqueness — that check still
 * happens server-side against the real `posts.slug` unique index.
 */
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}
