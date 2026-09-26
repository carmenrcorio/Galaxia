## Natal chart patterns (branch `cursor/aspect-patterns-6490`) — 2026-09-26

**Trigger**: Natal charts exposed individual aspects but did not identify the
larger structures those aspects form.

`[ADDED]` **One engine-owned aspect-pattern detector.** `@galaxia/astro` now
detects Grand Trines, T-Squares, and sign-based stelliums from computed chart
facts. The chart engine version advances to 3 so web profiles refresh saved
charts; mobile derives patterns locally for legacy saved charts until refresh.

`[CHANGED]` **Web and mobile person profiles show Chart Patterns.** Pattern
cards appear only when a chart contains a qualifying structure. The prior
web-only house/sign stellium detector and its separate interpretation were
removed, leaving sign stelliums as the single defined stellium type.
