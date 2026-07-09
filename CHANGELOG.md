# Galaxia — Changelog & Decision Log

Every meaningful change, decision, and reversal. Newest first. If a decision is not written here, it will be re-litigated or broken.

Format: `[TYPE] Summary` followed by the reason. Types: `DECISION`, `FIXED`, `ADDED`, `CHANGED`, `REVERTED`, `BROKEN`, `OPEN`.

---

## 2026-07-09

**[ADDED] Chart wheel on `/app/person/[id]` (deferred from step 6, now built).**
Ported `Wheel()` from `design/reference/galaxia.jsx`. SVG ring chart: outer ring, 12-sector sign ring with element fill (18% opacity) + cream glyphs, house ring (only when cusps available), planets at true ecliptic longitudes with element-coloured glyphs, aspect lines across inner disc. `#3a2f63` strokes replaced with `rgba(230,174,108,.13)` gold hairline. When no exact time: renders zodiac + planets only, with a note explaining houses and rising require exact time + location. Responsive via SVG viewBox.

**[FIXED] Groups page placement classes** updated to `pl-row` / `pl-body` / `pl-desc` / `glyph-sq` matching the current CSS.

**[CHANGED] Design parity steps 4–6 (`cursor/design-steps-4-6-b265`).**

Step 4 — `/app` constellation:
- Canvas rendering ported from `design/reference/galaxia-constellation-prototype.html`. Node forms now derived from relationship type: self (gold disc + outer ring), binary partner (two orbiting bodies + ellipse), moon/child (crescent), fixed/parent (four-point flare + disc), ancient/ancestor (diffuse glow + expanding ring), star/sibling (disc + highlight).
- Radial glow halos: `createRadialGradient`, halo radius scales with data precision (exact=5.5×, date=8×, year=11×) — year-only people render as soft diffuse light, exact-time as crisp.
- Links: quadratic bezier curves + gradient between node element colours (prototype `hexA` pattern). Travelling light pulse along each link via `t * 0.0002` fraction along the bezier.
- Gentle drift: `sin/cos` with per-person phase and speed, matching prototype `pos()`.
- Hover inspector: glass card floating over canvas, slides in, shows form / precision / "click to open".
- Click on any node routes to `/app/person/[id]`.
- Legend strip: celestial form key at bottom of canvas container.
- Duplicate bottom nav row deleted per spec.
- Canvas fills full container width (was ~55% with dead space).

Step 5 — `/app/compare`:
- Numeric score line (`Overall 52 · emotional 55`) replaced with `.dyn`-style labeled qualitative outcomes from landing: word labels from `galaxia.jsx sdesc()` thresholds (≥76 Effortless, ≥68 Easy & warm, ≥58 Workable, ≥48 Tender, else Charged), colour-banded with thin underline bars sized to percentage.
- Raw numbers behind a "Show numbers" disclosure.
- **Built the missing "What [name] needs from you" callout** — the tip block that the landing promises and the app never had. Renders for both persons with italic body copy and gold `→` lead-in.

Step 6 — `/app/person/[id]`:
- Big Three replaced with 3-up glyph chips from landing `.chip` pattern: glyph (zodiac unicode), label-caps (SUN/MOON/RISING), value (sign name), one-line vibe from `galaxia.jsx VIBE`.
- Placement list from landing `.pl` pattern: element-gradient glyph square (`galaxia.jsx EL_GRAD`), body name + house badge, degree as `16°48′` (not decimal), SIGN_VIBE gloss.
- Aspect section: sorted by orb ascending, tight (<2°) get gold left-border accent class, loose (>5°) dimmed. Aspect glyphs from `galaxia.jsx ASPGLY`, one-liners from `ASPLINE`.
- Glyph maps in `lib/design.ts` extended with `ASPECT_GLYPH`, `ASPECT_LINE`, `SIGN_VIBE`, `HOUSE_AREA`, `EL_GRAD` (all from `galaxia.jsx`).

---

## 2026-07-08

**[DECISION] `design/reference/` is the design source of truth, committed to the repo.**
`galaxia.jsx` (app structure: chart wheel, glyph maps, Home/Profile/Compare, starfield) and `galaxia-landing-v2.html` (material: glass, blur, aura, type scale). Reason: these lived outside the repo for weeks, so Cursor never saw them and invented generic replacements twice. Reference only; never imported by `apps/web`.

**[ADDED] `ENGINEERING.md`.** Standards derived from the failure modes actually hit in this project.

**[OPEN] Design parity work not started.** `.glass-card` in `apps/web/app/globals.css` uses `blur(8px)`, an opaque violet border, `16px` radius, `18px` padding, and **zero `box-shadow` anywhere in the file**. The landing uses `blur(22px) saturate(1.15)`, a translucent gold hairline `rgba(230,174,108,.13)`, `22px` radius, `24px` padding, and a two-layer shadow with an inset highlight. There is also **no starfield or cosmic aura in the app shell**. This is the single highest-leverage fix. See `galaxia-design-parity-spec.md`.

**[FIXED] Vela edge function reaching Anthropic.** Rewritten for the Anthropic Messages API (`https://api.anthropic.com/v1/messages`, `anthropic-version: 2023-06-01`, system prompt as a top-level field, `content_block_delta` SSE parsing). Runs on a single `ANTHROPIC_API_KEY`. Model pinned to `claude-sonnet-5` via `ANTHROPIC_MODEL`.

**[FIXED] Vela deployed to the wrong Supabase project.** The function was deployed and tested against `nsmkddufubobtmhypfho` (an unrelated project) while the key lived on `eigfvribtntbxyjutsma`. Symptom was a misleading "not configured" 503.

**[FIXED] Edge function required manually-set `SUPABASE_*` secrets.** Supabase auto-injects these and blocks setting them by hand. The function now reads the injected values.

**[FIXED] Hardcoded placeholder synastry scores fed to Vela.** Vela was reasoning over invented compatibility numbers. Now uses real `computeSynastry` output.

**[FIXED] Debug scaffolding shipped to production.** Removed: `Upgrade to Galaxia+ (debug)` label, `Connected to shared Supabase account` footer, raw session UUID, `monospace` fonts in the notes and Vela inputs, and a black-on-dark Arial rendering bug on `/app/groups`. The debug tier toggle wrote directly to the database, allowing a user to grant themselves a paid plan. That was a revenue defect.

**[FIXED] App screens 404'd in production.** The entire web app (`/welcome`, `/app`, `/app/person/[id]`, `/app/compare`, `/app/groups`, `/app/vela`, `/app/settings`) sat unmerged on branch `cursor/web-app-vertical-slice-b265` for weeks while everyone debugged deploy config. Merged to `main` with `-X theirs`, keeping the premium landing page.

**[DECISION] No root `vercel.json`.** Vercel's native Next.js detection with Root Directory `apps/web` and Framework Preset `Next.js` is the working configuration. Every custom `vercel.json` we tried fought one of those two settings (doubled output paths, missing Next detection, or a hunt for a nonexistent `public/` directory).

**[FIXED] Premium landing design ported into `apps/web/app/page.tsx`.** Previously the design only existed on a throwaway static Vercel project (`galaxia-site`) while the real project served a bland stub.

**[OPEN] Retire the `galaxia-site` Vercel project.** Only after confirming the `galaxia` project serves the premium landing.

---

## 2026-07-07 and earlier

**[FIXED] Geocoding and timezone for birth data.** City → lat/lng, IANA timezone via coordinate lookup, stored `tz_offset_min`. Birth time was previously treated as UTC, which silently produced wrong houses and rising signs.

**[DECISION] Keyless geocoding.** Open-Meteo (not Nominatim) plus `tz-lookup`. City-level accuracy is sufficient for a natal chart; a keyed provider adds billing setup for no accuracy benefit. Manual lat/lng remains an advanced override.

**[DECISION] Interpretation copy is a static curated library, not LLM-generated.** Reason: instant, free, deterministic, and it protects the brand promise ("real astrology, not AI making things up"). Vela remains the conversational layer on top.

**[FIXED] Supabase schema applied.** Four migrations run in order against `eigfvribtntbxyjutsma`; 14 tables. The schema had never been applied to this project, so every write would have failed.

**[DECISION] `eigfvribtntbxyjutsma` (GALAXIA org) is the only Galaxia Supabase project.** `nsmkddufubobtmhypfho` belongs to an unrelated project and must never appear in this codebase.

**[FIXED] `ERR_INVALID_THIS` on every Vercel install.** pnpm 9.12.3 could not reach the npm registry on Vercel's Node version. Vercel ignores the `packageManager` field, so the version had to be forced. Since resolved by removing custom install commands entirely.

**[FIXED] Expo web white screen.** Metro cannot resolve pnpm's nested `node_modules`. Root `.npmrc` now sets `node-linker=hoisted`. Also added the missing `metro.config.js` and `babel.config.js` to `apps/mobile`.

**[FIXED] Critical engine bug: heliocentric coordinates in a natal chart.** An AI agent used `EclipticLongitude()` (heliocentric) instead of geocentric positions. The Moon, Mercury, Venus, and Mars were all wrong. The agent's own tests passed because they tested its own wrong output. Fixed with `GeoVector`/`Ecliptic`/`EclipticGeoMoon`. **Lesson: test against external ground truth, never self-consistency.**

**[DECISION] `astronomy-engine` (MIT), not Swiss Ephemeris (AGPL).** Chiron and asteroids will come from an embedded ephemeris data table rather than an AGPL dependency.

**[DECISION] Names are locked.** App = Galaxia. Home view = Galaxia Mea. AI guide = Vela. Do not re-suggest.

---

## Open items

- **[OPEN] Design parity.** Card recipe, app-shell atmosphere, shared components. See `galaxia-design-parity-spec.md`. Highest leverage work in the product.
- **[OPEN] The moat is undesigned.** Three independent audits agreed: the constellation graph and the generational layer are the only features no competitor has, and they are currently the least designed things we ship. The constellation is a cropped force graph with no glow, no curves, no hover state, using ~55% of its container.
- **[OPEN] `/app/compare` contradicts the marketing promise.** It prints `Overall 52 · emotional 55` while the landing promises "Not a dating-app score. A real map." The "What [name] needs from you" callout, the actionable payoff of the whole feature, was never built.
- **[OPEN] Natal chart is incomplete.** Missing Chiron, North/South Node, Lilith, retrograde flags, element/modality balance, and the chart wheel that exists in `design/reference/galaxia.jsx`. House system must default to **Placidus** to match the sites users cross-check against; the engine currently uses whole-sign. See `galaxia-natal-chart-standard.md`.
- **[OPEN] Constellation as a living sky.** Prototype exists (`galaxia-constellation-prototype.html`): celestial form derived from bond type, sharpness derived from birth-data precision, nebulae for generational cohorts, transits as shooting stars, drag-to-name constellations. Not yet specced for build. Held pending review.
- **[OPEN] Chart accuracy regression tests** against astro.com for known charts.
- **[OPEN] Mobile app** (`apps/mobile`) still points at the wrong Supabase URL in its local `.env`.
