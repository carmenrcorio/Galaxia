## Remembrance Phase 1 (P3) — memorial constellations (branch `cursor/memorial-constellations-a410`) — 2026-07-24

**Trigger**: Passed people can be given a real sky pattern on the constellation — a small memorial glyph — without inventing stars. Most owners will never pick one, so the default path must stay familiar.

`[ADDED]` **Static memorial constellation library** in `@galaxia/core` (`memorial-constellations.ts`). Sixteen patterns with stable ids, IAU abbreviations, normalized Hipparcos-projected star coords (barycenter near origin, roughly [-1, 1]), and traditional stick-figure line pairs: Cassiopeia, Orion, Lyra, Cygnus, Scorpius, Leo, Ursa Major (Plough / Big Dipper asterism), Ursa Minor, Andromeda, Perseus, Aquila, Corona Borealis, Gemini, Taurus, Boötes, Draco. No runtime fetch. Unknown / empty `people.memorial_constellation` never invents a pattern.

`[ADDED]` **Galaxy memorial glyphs** on `/app`. When `passed_at` is set and a known `memorial_constellation` is assigned, the person draws as a stroke-light point-and-line glyph at their existing seat (ring 6) instead of an ancient-light node. No per-star glow stack; respects `lowPerf` and `prefers-reduced-motion`. Seat stability unchanged — glyph positions use the same `galaxySeatsResolved` map.

`[ADDED]` **Memorial constellation picker** in `edit-person-panel.tsx`, gated on `passed_at` the same way Remembrance is. Shows the actual pattern (SVG) beside each name, plus an “Ancient light” unset option. Persists immediately to `people.memorial_constellation`. Person-page select widened for the column. Display names and picker copy marked FOUNDER-REVIEW.

`[CHANGED]` **Honor edges reattach to the glyph centroid.** Declaration data (`relationships` / `remembrance`) is unchanged. Attachment uses the same seat `nodePos` that centers the memorial glyph (or ancient node when unassigned).

`[DECISION]` **Unassigned deceased keep ancient light.** `passed_at` with null / unknown `memorial_constellation` still renders the soft ancient-light node. Most users never pick a pattern; the fallback is what people actually see. A glyph appears only after an explicit assignment.
