## Quick-check modal uses synastry aspect library (branch `cursor/quick-check-synastry-voice-afb3`) — 2026-07-23

**Trigger**: In-app Quick Check still called natal `interpretAspect` for its between-you aspect rows, so curated synastry copy never reached that surface and natal "They…" voice could leak. Compare already uses `interpretSynastryAspect`.

`[CHANGED]` **`apps/web/components/quick-check-modal.tsx`** swaps `interpretAspect` → `interpretSynastryAspect` for the compact "Where it flows and catches" rows. Same arguments and lowercasing. Keeps the modal's own markup, top-4 cap, and existing `a.from !== a.to` filter. Does not reuse `FlowsAndCatchesSection` (that section's intro/legend/tactic chrome is too heavy for the modal). Display copy only; aspect computation untouched.

`[DECISION]` **Natal person-page call sites stay on `interpretAspect` / `ASPECT_PAIR`.** Outer-planet pairs still hit neutral `ASPECT_NATURE` until aspect pass 2; never natal `ASPECT_PAIR`. Closes the OPEN follow-up in `cursor-synastry-aspect-library-7f3e`.
