## Constellation frame budget — meteors return (branch `cursor/constellation-frame-budget-b21f`) — 2026-07-24

**Trigger**: P4 shooting stars never appeared because `lowPerf` shed them. The
approved frame-cost diagnose (`cursor-constellation-frame-cost-9ec3`) named the
per-frame nebula `lighter` blit as ~87–99% of constellation draw. Cut that
before retouching meteor timing.

`[CHANGED]` **Atmosphere is its own DPR-1 canvas.** Wash (resize-stable) +
generational nebulae bake onto a visible atmosphere canvas ~4×/s; `lighter`
runs only on that refresh. The motion canvas clears to transparent and draws
rings / links / nodes / meteors — no per-frame atmosphere blit.

`[CHANGED]` **No frame-0 phone `lowPerf` heuristic.** Retina phones no longer
enter the degraded stack before EMA has a vote. EMA still sheds meteors first
(≈24ms) then glow/nebula (≈26ms), armed only after the entrance settles, and
recovers with hysteresis when the frame budget returns.

`[REMOVED]` Temporary `?meteors=force` / `__meteorDiag` diagnose probe (spawn
path confirmed; shed was the gate).

`[TESTED]` **375px · DPR-2 · Playwright + CDP CPU throttle** (temp `__demo`
seed + middleware bypass removed before commit):

| Profile | Before | After | `lowPerf` / meteors |
|---|---:|---:|---|
| 4× throttle, steady-state | **31.4 fps** | **53.4 fps** | before: shed from frame 0 · after: `lowPerf=false`, `meteorsOff=false`, streak observed on shipping timing (~20s) |
| 1× (unthrottled) | — | **60 fps** | under budget |
| `prefers-reduced-motion: reduce` | — | static | `meteorsOff=true`; 0 pixel change after fade |

Ship gate: steady-state under budget so ambient streaks return on existing
timing without forcing them over a struggling frame.
