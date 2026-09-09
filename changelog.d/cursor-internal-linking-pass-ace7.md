## Internal linking pass across standalone pages, chart tools, and the blog (branch `cursor/internal-linking-pass-ace7`) — 2026-09-09

**Trigger**: `/why-galaxia`, `/generations`, `/meet-vela`, `/security`, `/pricing`, and `/synastry-chart-meaning` existed as standalone, indexable pages with no contextual links between them — most were only reachable from `/` through second-order links, several sitting 3-4 clicks deep.

`[FIXED]` **`MarketingNav` pointed five of its seven items at homepage anchors, not the standalone routes.** `#shift`/`#generations`/`#vela`/`#trust`/`#pricing` scrolled `/` to a section instead of navigating to `/why-galaxia`/`/generations`/`/meet-vela`/`/security`/`/pricing` — the standalone pages those anchors were carved out into. Same bug in `<SiteFooter>`'s `Pricing` link (`#pricing` anchor instead of `/pricing`). Both now use real routes, making every standalone page 1 click from `/`.

`[FIXED]` **`/chart`'s "Check compatibility" pill used `router.push`, not a real `href`**, so `/chart/compare` had no crawlable link from `/chart` (only reachable via the synastry post's markdown). Converted to a `<Link href="/chart/compare">`, matching the symmetric `<Link href="/chart">` `/chart/compare` already had.

`[ADDED]` **`RelatedLinks` component** (`apps/web/components/marketing/related-links.tsx`) — a small, curated "keep exploring" / "from the blog" link block, added to the foot of all 5 standalone pages and (in a `bare` variant, no nested `.container`) below the intro on `/chart` and `/chart/compare`. Each page links to 2-3 contextually relevant pages (e.g. `/generations` → "Ask Vela about generational patterns" + "How we protect your family's data"), not a full site-map dump.

`[ADDED]` **Contextual links inside the `synastry-chart-meaning` post body** via a new migration (`20260909120000_synastry_post_internal_links.sql` — the original seed migration was already applied, so per `ENGINEERING.md` §2 this is an `UPDATE`, not an edit to the applied `INSERT`): "What a chart cannot tell you" → `/meet-vela`, "the generational layer" mention → `/generations`, and the closing CTA → `/chart/compare`. `read_time_minutes` recomputed (6 → 7) for the ~50 added words.

Verified every route in the `/`, `/why-galaxia`, `/generations`, `/meet-vela`, `/security`, `/pricing`, `/chart`, `/chart/compare`, `/blog`, `/blog/guides`, `/blog/debunked`, `/synastry-chart-meaning`, `/privacy`, `/terms` set is reachable within 2 real `<Link>`/`<a href>` clicks from `/` — no orphaned pages.
