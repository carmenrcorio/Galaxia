## Scope Vela aspect naming to the computed payload (branch `cursor/fix-vela-aspect-payload-c8dd`) — 2026-09-16

**Trigger**: ENGINEERING.md §12. Vela was naming aspects it was not given. The prompt payload sent scores and signs, not the engine's computed aspect list, so the model invented contacts such as Mars square Saturn. The homepage Care bubble stated that aspect as fact.

`[FIXED]` **Vela may only name aspects in `aspect_list`.** `packages/vela` and `supabase/functions/vela-chat` now include the verbatim guardrail: "You may only name aspects that appear in the aspect_list field of this payload. If you are not given an aspect, you cannot name it. Never invent or infer an aspect not in the list." The edge function collects the aspect hits the existing synastry-score loop already finds (from, to, type, orb) and natal hits via the same finder (chart vs itself). Year-only charts stay off the list: sampled mid-year longitudes would fabricate orbs. No new aspect math.

`[FIXED]` **Homepage Care example no longer names a real aspect.** The Vela mock now says "Your charts share a rare harmonic pattern" instead of "Your Mars square his Saturn is the root." Illustrative copy, not a computed chart.
