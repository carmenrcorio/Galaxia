## Visual pass on the /blog index and category pages (branch `cursor/blog-index-visual-pass-5e37`) — 2026-09-09

**Trigger**: `/blog` and `/blog/[category]` sat on the plain `body { background: var(--ink) }` fill — no starfield, no glow, no astrological visual language — while every other authenticated/marketing surface (`/`, `/app/*`, `/chart`) runs `CosmicBackground`. It read as a generic dark-mode content template, not "the same product" as the chart/compare screens.

`[ADDED]` `components/blog/blog-zodiac-trail.tsx` — a purely decorative (`aria-hidden`) strip of the same `SIGN_GLYPH` unicode set `chart-wheel.tsx` already renders on `/chart` and `/compare`, faded to low opacity with an alternating vertical offset for an organic (not perfectly flat) feel. Rendered above the "Galaxia blog" eyebrow on both `app/blog/page.tsx` and `app/blog/[category]/page.tsx`.

`[ADDED]` `<CosmicBackground />` on both pages (same component and wrapping pattern as `app/page.tsx`: fixed background, then chrome, then `<main style={{ position: "relative", zIndex: 2 }}>`) — the starfield/aura/milkyway/grain/vignette treatment already used on `/`, `/app/*`, and `/chart`, reused unmodified.

`[ADDED]` `.blog-index-glow` — a static radial-gradient bloom behind the header block, using the exact rgba stops from the OG share card's `BloomBackground` (`app/s/[token]/opengraph-image.tsx`: `rgba(74,58,134,.5)` → `rgba(44,35,82,.26)` → transparent) rather than inventing a new palette.

`[CHANGED]` `.blog-post-card` gets the same frosted-glass recipe as `.glass-card` (backdrop-filter blur, dialed down from 22px to 18px) plus a gold glow on hover (`box-shadow` using the existing `rgba(230,174,108,…)` gold-hairline color already used for its border), instead of a flat semi-transparent fill.

**Decision**: left `QuickChartShell`/OG image generation untouched — this pass is scoped to the two `/blog` list surfaces per the PR split (`/[slug]` post pages already got a hero-image pass in the stacked hero-images PR).

Verified live at `http://localhost:3000/blog` and `/blog/guides`: confirmed the starfield background renders (matches `/` and `/chart`), the zodiac trail and header glow render above the eyebrow, the post card shows the frosted-glass look with a gold glow on hover, and the layout holds at a 375px mobile viewport (the trail hides every other glyph below 480px to avoid crowding) with no horizontal overflow and no console errors.
