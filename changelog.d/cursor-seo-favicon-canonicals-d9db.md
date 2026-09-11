## Favicon, canonicals, category OG images, and legal metadata (branch `cursor/seo-favicon-canonicals-d9db`) — 2026-09-11

**Trigger**: The App Router had no icon slot (`/favicon.ico` 404'd). The post template and `/download`, `/login`, `/signup` had no self-referencing canonical. Category pages set `openGraph`/`twitter` without `images`, which replaced the root OG card. `/privacy` and `/terms` inherited `SITE_DESCRIPTION`. Homepage meta description and the synastry post title exceeded crawler length limits.

`[ADDED]` **App Router icon slot** (`app/icon.tsx`, `app/apple-icon.tsx`, `app/favicon.ico`) plus static `/icon.png` and `/apple-touch-icon.png`. One navy `#0a0b1a` / gold `#d4a855` four-point star (`lib/brand-icon.svg` + `brandIconImage`). Next generates 32 and 192 from `icon.tsx`; Apple gets 180.

`[ADDED]` **Self-referencing canonicals** on the post template (`/{slug}`, never `/blog/`) and on `/download`, `/login`, `/signup`.

`[FIXED]` **Category OG images.** `buildCategoryMetadata` restates `/og-image.png` on `openGraph` and `twitter` so `/blog/guides` and `/blog/debunked` no longer drop the image.

`[ADDED]` **Page-specific meta descriptions + WebPage JSON-LD** on `/privacy` and `/terms`. Same JSON-LD pattern on `/blog` and `/chart` (on the server `page.tsx` wrapper, not the chart layout, so `/chart/compare` is not tagged as `/chart`).

`[CHANGED]` **Homepage meta description trimmed to 130 characters** (was 174). Hook kept (real birth charts of your inner circle; not your horoscope). FOUNDER-REVIEW.

`[CHANGED]` **`synastry-chart-meaning` title shortened to 55 characters** via `supabase/migrations/20260911180000_synastry_post_title_length.sql` (never an edit to an applied migration). Live checks stay behind `assertDisposableDbTarget`.
