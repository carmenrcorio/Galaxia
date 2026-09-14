## F10 blog posts (branch `cursor/f10-blog-drafts-db90`) — 2026-09-14

**Trigger**: Founder F10 drafts (six articles) needed to ship in the same pattern as the existing `posts` rows: SQL seed, top-level `/{slug}` route, Article JSON-LD, category `guides` | `debunked`.

`[ADDED]` **Six published posts** in `supabase/migrations/20260914180000_f10_blog_posts.sql`: mother's moon sign and repair (`guides`), generational workplace decoding (`guides`), Moon square Saturn parent-child (`guides`), what a natal chart cannot tell you (`debunked`), reading a deceased person's chart (`guides`), why compatibility scores are the wrong question (`debunked`). Titles ≤60, deks ≤155, bodies 1200–1600 words. Soft CTA to `/chart` or `/chart/compare`. Reciprocal links from the four live posts. Every authored string tagged FOUNDER-REVIEW. No U+2014.

`[CHANGED]` **`buildArticleJsonLd`** moved to `apps/web/lib/blog-article-json-ld.ts` so the Article graph (canonical `https://galaxiamea.com/{slug}`, never `/blog/`) is unit-tested. `app/[slug]/page.tsx` still renders it for every published row.
