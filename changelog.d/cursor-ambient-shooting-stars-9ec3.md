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

`[TESTED]` **375px · DPR-2 · 4× CPU throttle** constellation FPS re-measured
after this pass (see PR / walkthrough). Ship gate: must not fall below the
post-ring-guides 31–34fps bar; if it does, the particle budget is too high.
