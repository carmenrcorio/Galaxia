## Blog post hero images: post page banner + index card thumbnail (branch `cursor/blog-hero-images-5e37`) — 2026-09-09

**Trigger**: Part C of the blog CMS work (stacked on `cursor/blog-posts-admin-cms-5e37`) — the `posts.hero_image_url` column and its admin upload existed, but nothing displayed it.

`[ADDED]` `app/[slug]/page.tsx` now renders a full-width, rounded hero banner (new `.article-hero` CSS) above the post title when `hero_image_url` is set, and uses it for the page's `openGraph`/`twitter` image (falling back to the generic site OG card when unset). `BlogPostCard` now renders a smaller `16:9` thumbnail (new `.blog-post-card-thumb`) above the category tag on `/blog`.

`[DECISION]` Both render nothing at all — no placeholder, no broken-image box — when `hero_image_url` is empty, which is the real state of the migrated synastry post today. Assigning it a hero image is a content task for Carmen through `/admin/posts` (Part B), not something to fabricate here.

Verified live against the real Supabase project: created a throwaway test-admin account, published a test post with a hero image through `/admin/posts`, confirmed the thumbnail rendered on the `/blog` card and the full banner rendered above the title on the post's own page (no console errors, no broken-image icon), then deleted the test post, its uploaded image, and the test admin account.
