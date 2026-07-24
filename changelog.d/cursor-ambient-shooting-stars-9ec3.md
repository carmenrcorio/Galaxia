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

### Diagnose (why streaks never appear) — 2026-07-24

`[OPEN]` **Root cause = #2 lowPerf shed, not spawn timing.**
`meteorsOff = reduced || lowPerf` at init; EMA also kills streaks at ≈24ms
before the glow stack at ≈26ms. Measured:

| Viewport | Initial `lowPerf` | After ~9s | `meteorsOff` |
|---|---|---|---|
| 375px · DPR-2 | **true** (heuristic: `min(W,H)<380` and `DPR>=2 && W<430`) | true | **true from frame 0** |
| 1450px · DPR-2 | false | **true** (EMA ≈35ms on this canvas) | **true before/around first spawn** |

On a 31–34fps machine the EMA path sheds the layer within a second of warmup;
the first spawn opportunity is 5.2–8s later — so nothing is ever drawn.
Spawn cadence itself is not "every few minutes" (cap 2; E[first] ≈20s if the
layer were allowed). `prefers-reduced-motion` is a correct `matchMedia` read and
only blocks when the OS setting is on.

`[REMOVED]` Temp draw-path probe (`?meteors=force` / `__meteorDiag`) — confirm
done; shed gate fixed in `cursor-constellation-frame-budget-b21f`.
