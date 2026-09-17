## Phase 3 mobile wheel twin (branch `cursor/mobile-wheel-twin-1b96`) — 2026-09-17

**Trigger**: Twin spec Phase 3 after shell (`#334`). Same wheel numbers on device and `/app/person/[id]`. No living constellation (Phase 4).

`[ADDED]` **Shared glyphs + geometry in `@galaxia/core`.** `SIGN_GLYPH` / `BODY_GLYPH` / `ASPECT_GLYPH` / `signElement` plus `layoutChartWheel` (300 viewBox, ASC at 180, overlay 72/96 rings, cluster 16°). Web ChartWheel is the DOM SVG paint path; it still owns the natal `computeSynastry` fallback so overlay Compare never recomputes lines.

`[ADDED]` **`react-native-svg` natal wheel on person.** Same layout, ZodiacGlyphs TTF for the 22 sign/planet codepoints Inter cannot paint. Eyebrow from `houseSystemLabelForChart`. Person page passes `selectNatalAspectGeometry` (tightest 14). Year precision keeps the honest empty-center note.

`[ADDED]` **Bi-wheel on Compare.** `orientSynastryWheel` so self owns the inner house frame. Houses gate uses `COMPARE_WHEEL_NEEDS_HOUSES`. Charts stay on the compare result (`chartA` / `chartB`).

`[TESTED]` Core geometry vs the web layer table, web ChartWheel suite, mobile wheel-twin wiring, precision select update. Web wiring tests now read Expo tabs paths (`(tabs)/home` / `compare` / `vela` / `settings`) left behind by Phase 2. Metro boot + typecheck. Device unverified (Cloud Agent cannot prove native UI).

`[OPEN]` Device unverified. Phase 4 is the living constellation.
