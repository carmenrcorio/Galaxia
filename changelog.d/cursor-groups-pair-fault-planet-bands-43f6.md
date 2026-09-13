## Groups: planet-banded Pair Dynamics and Fault Lines leads (branch `cursor/groups-pair-fault-planet-bands-43f6`) — 2026-09-13

**Trigger**: Pair Dynamics cards and the Fault Lines lead paragraph on `/app/groups` used fully generic full-share / partial-share (and full-diverge / partial-diverge, or clean 2-way / shifting) templates. Planet names and sign pairs were already computed and shown as chips, but the lead sentences did not name which generational planets were shared or diverged.

`[CHANGED]` **`describePairHighlight` is banded by planet count (1 / 2 / 3).** Same Generation and Fault Line each have three authored FOUNDER-REVIEW templates. Every sentence names the actual planets (Oxford-comma `joinNames`); Fault Line counts 1 and 2 also name the still-shared remainder. Badge and chip-row `detail` are unchanged.

`[CHANGED]` **`faultLinesInterpretation` is banded the same way.** Replaced "On every/most of the slow-moving planets" (and the shifting fallback that did not distinguish count) with count-banded FOUNDER-REVIEW leads that name Uranus / Neptune / Pluto. Kept the 2-way vs shifting partition as a secondary axis so people names still appear when the split repeats.

`[ADDED]` **Unit coverage in `groups-copy.test.ts`.** Each band produces structurally distinct copy; the same pair (or group) with a different planet set at the same count produces a different sentence. Shared Sky (`sharedSkyLines`, `SHARED_SKY_TAIL`) and Shared Placement (`interpretSharedPlacement`) were not touched.
