## Move Compare "needs from you" above the dynamic table (branch `cursor/compare-needs-above-fold-d638`) — 2026-09-26

**Trigger**: The most actionable Compare copy — what each person needs — sat below the scores table, so it was below the fold on a successful run.

`[CHANGED]` **Needs tip blocks now render above "Your dynamic"** on `/app/compare`, `/chart/compare`, and `/s/[token]` compare snapshots. Result header (avatars, names, wheel) is unchanged. `relationshipWatchLine` still sits under the score rows. Tips stay inside `ChartImageExport` so the share image includes them. Copy, `whatTheyNeed()`, `FlowsAndCatchesSection`, `GenerationalSection`, and mobile Compare are untouched.
