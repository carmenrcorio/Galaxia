## Natal aspect readings: author the 20 that actually render, then suppress the rest (branch `cursor/natal-aspect-authored-batch-ead0`) — 2026-09-11

**Trigger**: Unauthored natal aspect cells were filling Key aspects / placement expand with `ASPECT_NATURE` lines (`friction that makes them grow` and four siblings). That is the never-fabricate failure: a generic nature line sitting where a specific reading goes. Production: 89% of rendered Key-aspect rows were fallbacks.

`[DECISION]` **Hybrid fork.** Author the 20 highest-frequency unauthored natal cells (Phase 0 rank, FOUNDER-REVIEW, no U+2014), then suppress everything still unauthored. Do not touch synastry (already 0% fallback on rendered rows). Do not author `transit-interpretations.ts` (not wired to a live surface).

`[ADDED]` **20 natal `ASPECT_PAIR` cells** in `packages/astro/src/interpretations.ts`, in production-render order: neptune-pluto sextile, mercury-venus conjunction, mars-mercury square, moon-pluto conjunction, pluto-uranus sextile, neptune-uranus conjunction, moon-sun trine, mercury-sun conjunction, jupiter-moon conjunction, mars-moon sextile, moon-neptune trine, moon-saturn opposition, neptune-saturn square, neptune-sun conjunction, pluto-venus square, jupiter-saturn sextile, jupiter-sun opposition, mars-moon trine, mars-venus sextile, pluto-saturn trine. Outer-outer lines are written as cohort weather, not a private talent. The original 18 cells are unchanged.

`[CHANGED]` **`interpretAspect` returns `null` for an unauthored cell.** It no longer copies `ASPECT_NATURE` into a reading slot. `selectNatalAspectReadings` is the person-page Key aspects / placement expand list (authored only, tightest first, no padding). The wheel still uses `selectNatalAspectGeometry` (tightest 14, authored or not) so geometry is not silently thinned.

`[ADDED]` **`natalAspectCoverage()`** (authored, possible, unauthored keys). Header `Coverage lock: authored=38 possible=225` is asserted in CI by `packages/astro/test/natal-aspect-coverage.test.ts`. A comment that lies about coverage cannot ship.

`[OPEN]` **187 natal cells remain unauthored.** They no longer render. Further batches should keep going in production-frequency order, not alphabetically, and stop for FOUNDER-REVIEW at each batch boundary.
