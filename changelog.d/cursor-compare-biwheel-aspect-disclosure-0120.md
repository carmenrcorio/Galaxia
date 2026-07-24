## Compare bi-wheel + shared aspect disclosure (branch `cursor/compare-biwheel-aspect-disclosure-0120`) — 2026-07-24

**Trigger**: Compare surfaces rendered text rows with no chart visual; the dense planet-pair/degree table sat always-open under plain-language copy. QA hit authenticated `/app/compare`, which still carried its own inline aspect markup instead of the shared flows/catches path.

`[ADDED]` **Synastry bi-wheel via existing `ChartWheel`**: optional `overlayChart` + `aspects` props. Person A (self when tagged) is the inner ring and owns the house frame; B sits on the outer ring; no second house ring; no new chart engine. Overlay lines use already-computed synastry aspects (never recomputed). Mounted on `/app/compare`, `/chart/compare`, and `/s` compare snapshots. Same missing-cusps hedge as Quick Chart.

`[CHANGED]` **One shared `FlowsAndCatchesSection` path for all three Compare surfaces.** Folded `/app/compare`'s near-duplicate inline aspect table into the shared component. Full `RelationType` focus sort now applies (not romantic/platonic-only). Dropped `/app/compare`'s separate `relationshipAspectFraming` block and top-8 raw rows in favor of the shared openers/tactics/readings (top 6). Kept `elementSignal`, house overlays, and `showRaw` numbers toggle untouched outside the fold.

`[ADDED]` **Closed-by-default "Show aspect detail" disclosure** inside `FlowsAndCatchesSection`: plain openers + short readings + nurture/ease tactics stay visible; planet-pair notation and degree/strength sit behind the disclosure (mirrors "See full chart").

`[OPEN]` **Natal wheel aspect-line contrast**: lines are drawn for exact/date charts at 8%–22% opacity (`rgba(111,177,184|218,140,140|183,154,216, α)` with `α = max(0.08, 0.22 - orb*0.03)`), so the center can look empty. Left unchanged so one-arg natal behavior stays identical — contrast fix is a separate branch.
