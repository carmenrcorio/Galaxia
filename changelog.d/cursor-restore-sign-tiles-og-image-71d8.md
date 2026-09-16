## Restore sign tiles and OG share image (branch `cursor/restore-sign-tiles-og-image-71d8`) — 2026-09-16

**Trigger**: Two visual regressions: Sun/Moon/Rising glance tiles no longer sat under the natal wheel, and `GET /opengraph-image` had no App Router file so the share card 404'd even though `/og-image.png` still existed.

`[FIXED]` **Natal wheel glance tiles.** `SignGlanceTiles` renders a horizontal row of dark 12px-radius cards directly under `ChartWheel` on `/app/person/[id]`, `/chart`, and `/s` singles. Data is the same chart object the wheel uses: confident `sun`/`moon` placements and `chart.asc` for Rising. Uncertain or missing placements are omitted, never fabricated. Moon uses the crescent body glyph; Sun and Rising use a purple zodiac-sign badge. Labels are SUN / MOON / RISING. Big three readings, NatalSignReveal, and the header glance line are unchanged.

`[FIXED]` **Site-wide `/opengraph-image`.** Copied the current branded 1200x630 card (`apps/web/public/og-image.png`) to `apps/web/app/opengraph-image.png` so the Next.js file convention serves `image/png` at `/opengraph-image`. `app/layout.tsx` still restates `openGraph.images` as `/og-image.png`.
