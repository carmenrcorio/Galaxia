## Remembrance P3 follow-up — constellation picker on person page (branch `cursor/memorial-constellation-picker-a410`) — 2026-07-24

**Trigger**: P3 shipped the library and `/app` glyph render, but assignment lived nowhere owners look. The Remembrance person page (e.g. a passed grandparent) is where it belongs.

`[ADDED]` **Memorial constellation picker at the top of `RemembranceSpace`.** For anyone with `passed_at`. Each option shows the star pattern, name, one-line sky description, and traditional myth. Clear “None — ancient light” for the common case. Writes `people.memorial_constellation` — the same column `/app` already reads via `usesMemorialGlyph` → `getMemorialConstellation`.

`[ADDED]` **Curated summary + myth lines** on each library entry (static, real mythology only). FOUNDER-REVIEW on every myth line, summary, display name, and picker chrome copy.

`[CHANGED]` **Removed the buried edit-panel picker.** Assignment is Remembrance-space only; Edit still manages `passed_at` and points owners to Remembrance for the constellation.
