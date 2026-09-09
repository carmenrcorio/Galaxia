## Standalone pages for homepage anchor sections (branch `cursor/split-homepage-sections-into-pages-482e`) — 2026-09-09

**Trigger**: the homepage bundled 4+ distinct topics as same-page anchor sections (`#shift`, `#generations`, `#vela`, `#trust`, `#pricing`), each with genuinely different search intent, but only the homepage URL could ever rank for any of them.

`[ADDED]` **`/why-galaxia`, `/generations`, `/meet-vela`, `/security`, `/pricing`** — five new standalone routes, one per former anchor section, each reusing the exact same section component and visual chrome (`CosmicBackground`/`RevealObserver`/`MarketingNav`/`SiteFooter`) as the homepage. Each page adds a real `<h1>` + breadcrumb (new shared `components/marketing/section-page-intro.tsx`), page-specific metadata (title, description, `alternates.canonical`, Open Graph, Twitter), a `WebPage`+`BreadcrumbList` JSON-LD block (new `components/marketing/webpage-json-ld.tsx`, built on the existing `<JsonLd>` injector from `components/seo/json-ld.tsx`), and a CTA back to `/signup` (reuses `<CloseSection>`).

`[ADDED]` Registered all 5 new routes in `app/sitemap.ts`; updated its stale `/pricing`-is-anchor-only comment.

`[DECISION]` The homepage keeps every one of its existing anchor sections (`#shift`, `#generations`, `#vela`, `#trust`, `#pricing`) unchanged — deleting them from `/` is an explicit follow-up, not part of this change, so the in-page nav and same-page jump links still work exactly as before.

Verified: `pnpm typecheck` (all packages) and `pnpm --filter @galaxia/web build` both pass, with all 5 new routes prerendering statically (`○`) same as `/`. `pnpm --filter @galaxia/web test` passes (476 tests, including the pre-existing `seo-crawl-foundations.test.ts`). Manually confirmed in a browser that each new route renders its section's real content with a unique title/H1/meta, and that `/` itself is unaffected.
