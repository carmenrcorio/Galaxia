## Synastry aspect library for flows-and-catches (branch `cursor/synastry-aspect-library-7f3e`) — 2026-07-22

**Trigger**: Compare flows-and-catches rows were calling natal `interpretAspect`, so most pairs fell back to generic `ASPECT_NATURE` phrases ("an easy, available talent") and any pair hit would have used natal "They…" voice. Compare needs a between-you library that never leaks natal copy.

`[ADDED]` **`packages/astro/src/synastry-interpretations.ts`** — curated `SYNASTRY_PAIR` + `interpretSynastryAspect` (FOUNDER-REVIEW: every string static, hand-authored, between-you voice). PASS 1 covers the 7 core bodies (sun–saturn), 21 unordered pairs × 5 majors = 105 readings. Falls back to neutral `ASPECT_NATURE` only; never to natal `ASPECT_PAIR`.

`[CHANGED]` **`FlowsAndCatchesSection` only** swaps `interpretAspect` → `interpretSynastryAspect`. Shared by `/chart/compare` and `/s` compare snapshots, so both surfaces inherit in one change. Orb/aspect computation untouched (display copy only).

`[DECISION]` **Natal person-page call sites left on `interpretAspect` / `ASPECT_PAIR`** so third-person natal voice stays byte-for-byte unchanged. Do not merge the two tables.

`[OPEN]` **Follow-up:** `apps/web/components/quick-check-modal.tsx` still calls `interpretAspect` for its synastry-ish aspect rows (~line 223). Route it through `interpretSynastryAspect` in a later pass so quick-check gets the same between-you library.
