## Remembrance Phase 1 (P3) — memorial constellations (branch `cursor/memorial-constellations-a410`) — 2026-07-24

**Trigger**: Passed people can be given a real sky pattern on the constellation — a small memorial glyph — without inventing stars. Most owners will never pick one, so the default path must stay familiar. Assignment belongs on the Remembrance person page (e.g. a passed grandparent), not buried in Edit.

`[ADDED]` **Static memorial constellation library** in `@galaxia/core` (`memorial-constellations.ts`). Sixteen patterns with stable ids, IAU abbreviations, one-line sky summaries, traditional myth lines, normalized Hipparcos-projected star coords (barycenter near origin, roughly [-1, 1]), and stick-figure line pairs: Cassiopeia, Orion, Lyra, Cygnus, Scorpius, Leo, Ursa Major (Plough / Big Dipper asterism), Ursa Minor, Andromeda, Perseus, Aquila, Corona Borealis, Gemini, Taurus, Boötes, Draco. No runtime fetch. Unknown / empty `people.memorial_constellation` never invents a pattern. Display names, summaries, and myths marked FOUNDER-REVIEW — real mythology only.

`[ADDED]` **Galaxy memorial glyphs** on `/app`. `loadHome` selects `memorial_constellation`; `drawBody` calls `usesMemorialGlyph` → `getMemorialConstellation(person.memorial_constellation)` and paints a stroke-light glyph at the existing seat (ring 6) instead of ancient light. No per-star glow stack; respects `lowPerf` and `prefers-reduced-motion`. Seat stability unchanged.

`[ADDED]` **Memorial constellation picker at the top of `RemembranceSpace`** on `/app/person/[id]` (anyone with `passed_at`). Each option shows the star pattern, name, one-line description, and myth. Clear “None — ancient light” for the common case. Selecting writes `people.memorial_constellation` immediately — the same column the galaxy canvas already reads.

`[CHANGED]` **Honor edges reattach to the glyph centroid.** Declaration data (`relationships` / `remembrance`) is unchanged. Attachment uses the same seat `nodePos` that centers the memorial glyph (or ancient node when unassigned).

`[DECISION]` **Unassigned deceased keep ancient light.** `passed_at` with null / unknown `memorial_constellation` still renders the soft ancient-light node. Most users never pick a pattern; the fallback is what people actually see. A glyph appears only after an explicit assignment.
