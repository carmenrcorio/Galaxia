## Chart wheel aspect web visibility on main’s bi-wheel API (branch `cursor/chart-wheel-aspect-web-6e96`) — 2026-07-24

**Trigger**: The natal/synastry wheel’s aspect web was effectively invisible (alpha ~0.08–0.22) and glyphs were low-contrast. `#88` landed the Compare bi-wheel (`overlayChart`, `orientSynastryWheel`) and deferred contrast to this branch; compose onto that API rather than a parallel seam.

`[FIXED]` **Aspect web legibility on the dark disc (main 72/96 geometry).** Stroke alpha ~0.55–0.92 (orb-weighted; mist/neutral boosted) and stroke width 2; harmony via `--teal` / `--rose` / `--mist`. Planet glyphs cream-filled at `fontSize` 14 / `r` 12 natal, slightly smaller (13 / 11) in overlay so they don’t collide with the sign band at `R_PLANET_B = 96`. A-ring stroke = element CSS var; B-ring stroke = `--teal`.

`[CHANGED]` **Optional `aspects?: WheelAspect[]` (main’s type).** Overlay never recomputes — Compare must pass aspects. Natal: when passed (person page `natalAspects`), drawn exactly; when omitted, historical `orb < 5` / max-12 fallback. `#89`’s `Aspect`/`BodyName` typing carried nothing `WheelAspect` lacks (looser `from`/`to: string`).

`[ADDED]` **`interactive` + tap/hover highlight** (local state). PDF passes `interactive={false}`. Touch toggles; mouse hover. Owner keys stay `a-*` / `b-*`.

`[ADDED]` **Loud empty centers.** Year-only natal: FOUNDER-REVIEW birth-date note. Overlay without `aspects`: visible note (`OVERLAY_ASPECTS_MISSING_NOTE`) + `console.warn` — never a silent void that looks like a working wheel.

`[DECISION]` **Colours via CSS custom properties** (`var(--fire)` etc. / cream glyphs). PDF export is browser print of the live portal’d DOM; `chart-pdf-export` already uses the same vars on that surface — vars survive. No `lib/design.ts` hex mirror and no print `variant` prop.
