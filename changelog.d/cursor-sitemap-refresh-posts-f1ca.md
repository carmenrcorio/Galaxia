## Sitemap refresh (branch `cursor/sitemap-refresh-posts-f1ca`) — 2026-09-29

**Trigger**: The eight SEO posts are in production `posts`, and their pages return 200, but `/sitemap.xml` was cached at the build that ran before the migration.

`[FIXED]` **`app/sitemap.ts` revalidates every 60 seconds**, the same window as `/blog` and `/[slug]`. A post inserted after deploy shows up in the sitemap without another code change.
