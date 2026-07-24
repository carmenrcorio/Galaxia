## Ambient shooting stars on the constellation canvas (branch `cursor/ambient-shooting-stars-9ec3`) — 2026-07-24

**Trigger**: Phase 1 (P4) — last atmosphere pass on the `/app` constellation.
Short, calm, infrequent streaks so the sky feels alive without reading as an
effect or a data signal.

`[ADDED]` **Ambient shooting stars** on the `/app` constellation canvas only.
Cap of one to two live streaks; short cream trail + head; sparse spawn after
the entrance settles. Drawn behind nodes, after honor links. Never aimed at a
seat, never element-coloured, never tied to transits or events — decoration
only (`ENGINEERING.md` §13).

`[DECISION]` **Off under `prefers-reduced-motion`.** No spawn, no draw; any
in-flight streak is cleared. The reduced-motion path still ends on a static
frame after the gentle fade.

`[DECISION]` **Sheds first under `lowPerf`.** Ambient streaks start off when
the viewport already enters the lowPerf profile, and the EMA frame-budget watch
kills them (≈24ms) before flipping the existing lowPerf stack (≈26ms glow /
nebula / ring breath). No existing layer degrades before meteors are gone.

`[TESTED]` **375px · DPR-2 constellation draw-loop FPS** (Playwright + CDP CPU
throttle; temporary `__demo` seed + middleware bypass removed before commit):

| Profile | FPS | Notes |
|---|---|---|
| 4× throttle, shipping path (`meteorsOff` via phone `lowPerf`) | **60** | Streaks shed; no spawn. This VM’s 4× does not reproduce the prior 31–34 bar. |
| 4× throttle, force-dense streaks (test-only, denser than ship) | **57** | Peak 1 live; ~3fps vs shed — budget holds. |
| 6× throttle, shipping path | **44** | Closer stress stand-in for the prior mid-phone bar. |
| 6× throttle, force-dense streaks | **42** | −2fps vs shed under denser-than-ship load. |
| `prefers-reduced-motion: reduce` | static | 0 pixel change after fade; meteors never spawn. |

Ship gate: shipping path adds no draw work on the phone `lowPerf` profile
(streaks already shed). Forced denser load stayed within a few fps of shed —
particle budget is not the limiter. Prior 31–34 @ 4× was not reproduced here.
