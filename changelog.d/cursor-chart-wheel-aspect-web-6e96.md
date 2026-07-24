## Chart wheel aspect web visibility + biwheel seam (branch `cursor/chart-wheel-aspect-web-6e96`) — 2026-07-24

**Trigger**: The natal wheel drew an aspect web that was effectively invisible (alpha ~0.08–0.22), planet glyphs were small and low-contrast (especially air at `#B79AD8`), and the person page Aspects tab could disagree with the wheel’s independently filtered list. Compare’s biwheel needs an additive second-chart seam before that UI lands.

`[FIXED]` **Aspect web legibility on the dark disc.** Stroke alpha raised to ~0.55–0.92 (orb-weighted; mist/neutral gets a little extra weight) and stroke width to 2; harmony colouring kept (`--teal` / `--rose` / `--mist`). Planet glyphs bumped to `fontSize` 15 / disc `r` 13 with cream fill for contrast; element colour stays on the planet ring stroke so air no longer paints unreadable purple-on-black text. Verified readable at 375px DPR-2 without zoom.

`[CHANGED]` **Optional `aspects` prop — one list with the person page.** When passed, the wheel draws exactly that set and does not recompute. When absent, the historical internal filter stands (`orb < 5`, max 12) so `/chart`, share snapshots, and PDF keep working. Person page now passes `natalAspects` to both the Aspects tab and the wheel. On a representative exact chart those two lists **did** disagree: page = 14 orb-sorted (including ≥5°), wheel = ≤12 with `orb < 5` only.

`[ADDED]` **Biwheel seam: `outerChart?: NatalChart`.** Inner chart owns the house frame; outer planets sit on a second ring (`R_PLANET_OUTER = 102`); owner-prefixed keys (`inner-sun` / `outer-moon`). Not mounted on Compare in this branch — fixture-proven only.

`[ADDED]` **Tap/hover highlight** (local state): focusing a planet keeps its aspect lines and dims the rest. Touch toggles; hover works for mouse. PDF passes `interactive={false}` so highlight degrades to a static wheel.

`[ADDED]` **Year-precision empty-center copy** (FOUNDER-REVIEW): “Aspect lines need a birth date — a year alone can't place them honestly.” instead of a silent void.

`[DECISION]` **Colours via CSS custom properties, not a `lib/design.ts` hex mirror.** The PDF path is browser print of the live portal’d DOM (same `:root` tokens); `chart-pdf-export` already uses `var(--fire)` etc. on that surface, so vars survive. No `variant` prop needed — the print wheel sits on the same near-black `.pdf-wheel-panel`.
