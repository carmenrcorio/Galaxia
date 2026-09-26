## Quincunx (150°) on natal and synastry (branch `cursor/quincunx-aspect-676b`) — 2026-09-26

**Trigger**: Natal and synastry only computed the five majors. The quincunx is a real, commonly used minor aspect and was missing from both the engine and the flows/catches surface.

`[ADDED]` **Quincunx in `@galaxia/astro`.** `AspectType` / `AspectKey` / `ASPECT_DEFS` now include `quincunx` at 150° with a 2.5° orb and harmony −0.3. `computeSynastry()` picks it up from the defs table. Applying/separating is stored on `Aspect.phase` from placement longitude speed.

`[DECISION]` **Third group: "adjusts".** Tone is `adjust`, not flow / friction / fusion. Badge `~ adjusts`, tactic prefix `Adjust it:`. Classification is by type/tone, so the slightly negative harmony never falls into the catch branch. FOUNDER-REVIEW on the nature line, badge, prefix, opener, and tactic.

`[ADDED]` **`ASPECT_NATURE.quincunx` only (Option A).** No authored `ASPECT_PAIR` or `SYNASTRY_PAIR` cells. Natal `interpretAspect()` returns null. Synastry falls back to the nature line. Coverage lock moves to authored=38 possible=270.

`[FIXED]` **Score, transit, and Vela exclusions.** Quincunx is omitted from synastry score sums (1993–1994 and Little Rock pair scores unchanged). `computeTransits()` and the daily-nudge / relational-transit lists stay on the five majors. Vela citation allow-lists are unchanged.

`[ADDED]` **Display.** FlowsAndCatchesSection (Compare, Quick Compare, share snapshots) renders a third group after flows and catches. Wheel lines use the gold token. Natal person page lists quincunx as type + orb (and phase) outside Key aspects. Mobile Compare shows `~ adjusts` in gold under The astrology underneath.

`[ADDED]` **Glyph** `U+26BB` in `ASPECT_GLYPH`.

`[CHANGED]` **`/methodology` is honest about the new work.** Orb table includes quincunx at 2.5°. Omissions no longer list the quincunx or natal/synastry applying-separating as missing. Transits, daily notes, and Vela stay on the five majors. FOUNDER-REVIEW.
