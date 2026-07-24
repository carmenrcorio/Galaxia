## Remembrance Phase 1 (P2) — star color schema + picker (branch `cursor/star-color-schema-picker-023e`) — 2026-07-24

**Trigger**: Owners should be able to set a constellation star colour without changing bond-derived defaults for everyone else. Schema also reserves `memorial_constellation` for P3 drawing — this PR does not draw memorials.

`[ADDED]` **`people.star_color` + `people.memorial_constellation` (nullable text).** Both default NULL; existing rows unchanged. `star_color` NULL keeps the current element-based node colour (self stays gold). Migration: `supabase/migrations/20260724175420_people_star_color_and_memorial.sql`.

`[ADDED]` **Single node-color resolution** (`resolveNodeColor` in `@galaxia/core`). `star_color` (curated palette hex) ?? self-gold / `elementFromRelation` colour. Galaxy `/app` drawBody calls this once per node — no per-draw-call branching. Unknown/non-palette values fall back to the element path.

`[ADDED]` **Curated star-color picker** in `edit-person-panel.tsx` (alongside Remembrance / `passed_at`). Palette is design-system hues only (no raw hex input); **Default** clears back to NULL. Palette labels marked FOUNDER-REVIEW. `/app` `loadHome` and person-page selects widened for the new columns (memorial column loaded, not rendered).

`[DECISION]` **No memorial constellation drawing in P2.** The column ships empty for P3; honor/remembrance line drawing is unchanged. Mobile person-edit UI is later — mobile profile today is read-only for birth/profile fields (notes + delete only).
