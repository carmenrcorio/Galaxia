## T-square chart pattern cards show opposition legs (branch `cursor/t-square-pattern-detail-f0fd`) — 2026-10-03

**Trigger**: Person profiles could list multiple real T-squares that shared the same focal planet and modality. Cards only showed focal + modality, so distinct patterns looked like duplicate bugs.

`[FIXED]` **`@galaxia/astro` exposes `describeTSquarePattern` / `formatTSquarePatternDetail`.** T-square cards on web and mobile person profiles and the chart-pattern "Why this reading" line now render the opposition pair and focal (for example Mars opposite Chiron, both square North Node), using existing `AspectPattern` fields only.

`[OPEN]` **Pattern interpretation copy remains generic for T-squares and mostly element-only for grand trines.** Planet-specific pattern prose is still out of scope; track via a future `docs/readings-review/` batch like Chiron.
