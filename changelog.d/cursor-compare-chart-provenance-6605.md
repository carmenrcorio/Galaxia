## Compare chart provenance + visible longitude corrections (branch `cursor/compare-chart-provenance-6605`) — 2026-07-24

**Trigger**: QA saw overall 41 on a saved 7/10 reading and 43 on a re-run with no birth edit. Diagnosis: `computeSynastry` is deterministic; the delta was a frozen snapshot vs a recompute from `charts.data` that had been silently rewritten. Saved readings also stamped the app `CHART_ENGINE_VERSION` constant, so provenance falsely matched after backfill.

`[FIXED]` **Saved Compare readings stamp real chart provenance.** Payload now stores `engineVersionA` / `engineVersionB` from each charts row’s DB `engine_version` (not the app constant), plus `chartFingerprint` (placement longitudes) alongside `birthFingerprint`. History rows label non-comparable snapshots instead of presenting bare old/new scores as the same fact.

`[FIXED]` **Longitude-changing chart rewrites are no longer silent.** Person-page engine/house backfill still applies house-only updates quietly (they do not move scores). When placement longitudes change, the rewrite is applied, a `chart_correction` Record note is written (what moved, when), and a person-page banner surfaces it. FOUNDER-REVIEW on new authored strings.

`[ADDED]` **`chartPlacementFingerprint` / pair helpers in `@galaxia/astro`**, with tests; standing guard that scores one fixture pair twice and asserts equality. Scorer / `ASPECT_DEFS` / `SYNASTRY_PAIR` / `orbStrength` untouched.

`[ADDED]` **Migration** `notes` kind `chart_correction`.
