## Mobile LCP: first-screen text visible without JS (branch `cursor/mobile-lcp-atf-reveal-d685`) — 2026-09-16

**Trigger**: lab Lighthouse mobile LCP sat at 3.3–4.5s on `/`, `/chart`, `/chart/compare`, `/why-galaxia`, and `/pricing`. FCP was ~1s; the rest was element render delay. On `/` the measured LCP node was the 84×37 nav wordmark because hero text started at `opacity: 0`.

`[FIXED]` **Above-the-fold `.reveal` on `/why-galaxia` and `/pricing`.** `.reveal` is `opacity: 0` until `RevealObserver` hydrates, so Lighthouse could not count the real headline. WhySection (eyebrow, h2, both body paragraphs) and the first-screen price card / no-cap line / included block now paint in the SSR HTML. Below-fold pricing lines still use scroll `.reveal`.

`[FIXED]` **Homepage hero `.fade-in` on the LCP text (eyebrow, H1, ledes).** `.fade-in` uses `animation-fill-mode: both`, so the node is `opacity: 0` for the whole `animation-delay`. Phase 0 reported the `/` LCP as `div > nav > div.container > a` (Galaxia wordmark, 84×37), not the H1, for that reason. CTA and constellation keep CSS-only `.fade-in` — they were not the LCP node. `/chart` and `/chart/compare` already LCP on a visible `p.lede`; those nodes were not edited.

`[CHANGED]` **`NatalSignReveal` is a `next/dynamic` import in `quick-chart-entry.tsx`.** `MONTHS` is local so the homepage no longer imports `birth-fields`. `@galaxia/astro` is type-only (`import type { NatalChart }`) on `/`, `/why-galaxia`, and `/pricing` first load; the astro runtime loads after a successful mini-form submit.

`[CHANGED]` **`CosmicBackground` is code-split on the five public LCP routes** via `components/cosmic-background-lazy.tsx` (`next/dynamic`, SSR on so aura/milkyway/grain still emit in HTML). `prefers-reduced-motion` is unchanged inside `cosmic-background.tsx` (one static frame, no twinkle/parallax). Signed-in `/app/layout.tsx` still statically imports the canvas module.

B3 (defer `AppNav` / `TrialBanner` / `TimezoneSync` on `/chart`) is not in this branch.

Lab Lighthouse after this branch (local `next start`, mobile Slow 4G, 3-run median) reports the `/` LCP as `header.hero > div.hero-grid > div.hero-text > h1.hero-h1` and `/why-galaxia` as `section#shift > h2` (no `.reveal`). `/chart` and `/chart/compare` still LCP on the already-visible `p.lede`. CLS stays 0.000. Remaining LCP time is element render delay from JS/fonts, not opacity.
