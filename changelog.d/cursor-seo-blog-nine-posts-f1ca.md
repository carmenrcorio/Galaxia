## SEO blog posts (branch `cursor/seo-blog-nine-posts-f1ca`) — 2026-09-29

**Trigger**: Ship the approved relationship SEO posts on the existing top-level `/{slug}` route.

`[ADDED]` **Eight published rows** in `supabase/migrations/20260929174016_seo_blog_nine_posts.sql`, inserted the same way as PR #172 (`slug`, `title`, `dek`, `category`, markdown `body`, `status`, `read_time_minutes`, `byline`, `published_at`). Idempotent `ON CONFLICT (slug) DO UPDATE`. Category is `guides` because `posts.category` only allows `guides` and `debunked`. `published_at` is the brief's date at 12:00 UTC. There is no schedule, so `status = 'published'` makes them visible immediately, including dates after 2026-09-29. No `meta_title` column: the H1 title is the document title and the Article headline. `dek` is the meta description. No images.

`[DECISION]` **`whole-sign-houses-explained` is not inserted.** The draft says Galaxia uses and calculates Whole Sign houses. The app default is Placidus. Whole Sign is a settings option and the polar fallback (`apps/web/lib/methodology-copy.ts`). `chart-without-birth-time` still links to that slug. The link 404s until a corrected post is published. Copy was not changed to remove it.

`[OPEN]` **Venus retrograde CTA.** "which planets Venus will be touching as it moves backward" describes a retrograde-path scan. The app shows today's sky note per chart and a side-by-side comparison, not that forward scan. The post is published because it has to be live by 2026-10-01. Side-by-side comparison and flow/catch match the app.

`[ADDED]` **Markdown tables scroll inside the article** (`.article-table-wrap`) so the synastry-vs-composite table is not clipped by `body { overflow-x: hidden }` at phone width.

`[OPEN]` **Not applied to production.** Applying `public.posts` SQL is a human step after merge (ENGINEERING.md §16). Merging this file does not publish the rows.
