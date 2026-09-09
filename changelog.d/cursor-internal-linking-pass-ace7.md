## Internal linking pass across standalone pages, chart tools, and the blog (branch `cursor/internal-linking-pass-ace7`) — 2026-09-09

**Trigger**: `/why-galaxia`, `/generations`, `/meet-vela`, `/security`, `/pricing`, and `/synastry-chart-meaning` existed as standalone, indexable pages with no contextual links between them or out to the Quick Chart tools.

`[ADDED]` **`RelatedLinks` component** (`apps/web/components/marketing/related-links.tsx`) — a small, curated "keep exploring" / "from the blog" link block, added to the foot of all 5 standalone pages and (in a `bare` variant, no nested `.container`) below the intro on `/chart` and `/chart/compare`. Each page links to 2-3 contextually relevant pages (e.g. `/generations` → "Ask Vela about generational patterns" + "How we protect your family's data"), not a full site-map dump. `/why-galaxia` links to both Quick Chart tools (`/chart`, `/chart/compare`) since the homepage teaser grid (#170) doesn't link either directly — this keeps both within 2 clicks of `/`.

`[FIXED]` **`/chart`'s "Check compatibility" pill used `router.push`, not a real `href`**, so `/chart/compare` had no crawlable link from `/chart` (only reachable via the synastry post's markdown). Converted to a `<Link href="/chart/compare">`, matching the symmetric `<Link href="/chart">` `/chart/compare` already had.

`[ADDED]` **Contextual links inside the `synastry-chart-meaning` post body** via a new migration (`20260909120000_synastry_post_internal_links.sql` — the original seed migration was already applied, so per `ENGINEERING.md` §2 this is an `UPDATE`, not an edit to the applied `INSERT`): "What a chart cannot tell you" → `/meet-vela`, "the generational layer" mention → `/generations`, and the closing CTA → `/chart/compare`. `read_time_minutes` recomputed (6 → 7) for the ~50 added words.

`[DECISION]` Rebased onto `main` after #170 ("Rebuild homepage as a concise hub linking to standalone feature pages") landed with an overlapping fix — that PR already pointed `MarketingNav`/`SiteFooter` at the real standalone routes instead of homepage anchors, so this branch dropped its own now-redundant nav/footer changes and kept only the `RelatedLinks` + blog-post-migration + chart-tools work.

Verified every route in the `/`, `/why-galaxia`, `/generations`, `/meet-vela`, `/security`, `/pricing`, `/chart`, `/chart/compare`, `/blog`, `/blog/guides`, `/blog/debunked`, `/synastry-chart-meaning`, `/privacy`, `/terms` set is reachable within 2 real `<Link>`/`<a href>` clicks from `/` (excluding links gated behind filling out a form) — no orphaned pages.
