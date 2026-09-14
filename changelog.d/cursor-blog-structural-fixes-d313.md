## Blog article template: byline, smaller title, TOC, mid-post CTA, related posts (branch `cursor/blog-structural-fixes-d313`) — 2026-09-14

**Trigger**: Editorial review of the live blog. Date, byline, and read time lived only on index cards; the post h1 used the `.auth-title` clamp (up to 3.3rem) and ate the fold; there was no in-article TOC, no render-layer mid-post CTA, and no "Read next" row.

`[ADDED]` Post template (`apps/web/app/[slug]/page.tsx`) now shows a byline row under the title: `{byline} · {published_at} · {n} min read`. FOUNDER-REVIEW.

`[CHANGED]` Desktop-only (`min-width: 768px`) post `h1.article-title` is `2.25rem` / line-height 1.18 so the title, byline, and first paragraph fit a 1280px fold. Mobile still uses the shared `.auth-title` clamp. Font family and weight unchanged.

`[ADDED]` "In this piece" TOC for posts with `read_time_minutes >= 5`, built from `##` headings. Heading `id`s are generated in `ArticleMarkdown` (no new rehype package) so jump links resolve. FOUNDER-REVIEW.

`[ADDED]` Mid-post CTA injected in the markdown renderer after the midpoint h2 (or at 50% word count). Guides link to `/chart`, debunked to `/chart/compare`. Copy: "See how this plays out in your own chart →". Not written into `posts.body`. FOUNDER-REVIEW.

`[ADDED]` "Read next" row before the bottom CTA: two same-category posts (fill from the other category if needed), title and dek only, using `BlogPostCard` `variant="related"`. FOUNDER-REVIEW.

`[OPEN]` Phase 6 internal links in post bodies: map of unlinked concept-term mentions is in the PR for founder review. No `UPDATE` of `posts.body` until Carmen confirms. Do not apply to production.

`[OPEN]` Phase 7 stagger `published_at` across the past 8 weeks. Proposed schedule is in the PR, matched to live slugs. No migration applied until Carmen confirms. Do not apply to `eigfvribtntbxyjutsma`.
