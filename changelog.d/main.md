## Shared placement grammar + banded pair tails (branch `main`) — 2026-09-13

**Trigger**: Groups copy had a sentence-concatenation bug in shared personal placements, and pair-level Shared Sky tails were static per planet with no era-gap differentiation.

`[FIXED]` **Rebuilt `interpretSharedPlacement` sentence assembly to stay grammatical across all six personal planets.** The domain fragment now remains inside one coherent sentence with the sign-vibe tail, eliminating the period-plus-lowercase clause break that previously rendered ungrammatical output.

`[CHANGED]` **Updated `SHARED_SKY_TAIL.pair` to use era-gap bands per planet instead of one static tail per planet.** Pair tails are now selected from adjacent/mid/distant bands using planet-specific sign-step thresholds grounded in each outer planet's orbital cadence, while `whole` and `majority` tails remain unchanged.
