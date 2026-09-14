## Restore relationship lines on the galaxy (branch `cursor/relationship-line-render-f22d`) — 2026-09-14

**Trigger**: Phase 1 restored the `relationships` table so approved types can exist. Phase 2 reads every declared row back onto the constellation and draws each type with its own colour. Remembrance stays the same stroke: `RELATION_LINE_STYLE.remembrance` is `HONOR_LINE_STYLE` by identity.

`[CHANGED]` **Constellation and honor-declaration fetches no longer filter `relation_type`.** `loadHome` and `HonorDeclarationBox.loadHonorConnections` select every owner edge. Honor delete and honor insert stay `remembrance`, so "who carries their light" cannot remove a partner or family row. `livingIdsFromHonorRows` still honor-filters the checkbox set.

`[CHANGED]` **`honorEdgesFromDeclaredRows` draws every approved type.** Remembrance still requires one passed and one living endpoint and still strokes passed → living so `bezierCP` does not flip. Partner / family / friend / colleague / chosen / other draw living-to-living (and any other pair in the people map) using canonical `person_a` → `person_b`. Dedupe key includes `relation_type`. `synastryCannotSubstituteHonor` looks at remembrance edges only. Legend "Honor / remembrance light" gates on remembrance, not `honorEdges.length`.

`[ADDED]` **`RELATION_LINE_STYLE` and `connectionDiff`.** Same dash, alpha, width, and pulse as honor; colours only: partner gold, family earth, friend warm, colleague mist, chosen violet, other cream. `drawHonorLink` looks up the style and does not early-return on non-remembrance. Synastry `drawLink` is untouched.

`[TESTED]` Remembrance-only galaxy under `prefers-reduced-motion` is byte-identical before vs after (`md5 66de70089996d7181440f45094be5443`). Partner gold draws beside remembrance teal on the same canvas. Temporary `__demo` hooks were removed before commit. Test floors this run: core 288, web 1284, astro 393, vela 28, mobile 83.
