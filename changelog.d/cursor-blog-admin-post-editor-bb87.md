## Admin post editor with photo block management (branch `cursor/blog-admin-post-editor-bb87`) — 2026-09-15

**Trigger**: Carmen needs to assign heroes and insert/reorder/remove body photos on published and draft posts without hand-editing markdown or leaving `/admin`.

`[DECISION]` **Authorization is `requireAdmin()` / `admin_users`, not an owner-email check.** Same gate as `/admin/analytics`: the `/admin` layout calls `requireAdmin()`, APIs call `requireAdminApi()`, and nothing branches on a founder email. There is no `NEXT_PUBLIC_ADMIN_EMAIL`.

`[CHANGED]` **`/admin/posts` lists every post (published and draft)** with title, status, `published_at`, and whether `hero_image_url` is set. Each row links to `/admin/posts/{slug}` (uuid bookmarks still resolve as a fallback).

`[ADDED]` **Slug editor at `/admin/posts/[slug]`.** Three load-bearing sections: hero (current image or "none set", dropdown of every file in the `blog-images` bucket, direct upload to `blog-images/photos/`), body photo blocks (heading/paragraph/image, drag to reorder, insert image after, remove image), and one explicit Save that rewrites `body` and `hero_image_url`. No auto-save. Last-saved timestamp is shown. Saving a body over 10,000 words asks for confirmation first, because the write is a full column rewrite.

`[CHANGED]` **`blog-images` accepts raster photos** (`20260915024600_blog_images_photo_uploads.sql`): PNG/JPEG/WebP/GIF at 8 MB, SVG heroes at the bucket root stay valid. New uploads go to `photos/<uuid>.<ext>`. GET/POST `/api/admin/posts/images` lists that bucket and performs the upload, both behind `requireAdminApi()`.
