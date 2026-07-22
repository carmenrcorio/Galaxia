## Make Quick Compare "Your dynamic" ratings legible (branch `cursor/dynamic-table-legend-0705`) — 2026-07-22

**Trigger**: The "Your dynamic" ratings table on `/chart/compare` and `/s/[token]` (compare) showed labels like Charged / Workable / Some friction with no scale direction, so readers could not tell whether Charged was good or bad.

`[FIXED]` **Extracted shared `DynamicTableSection`** used by both `/chart/compare` and compare share snapshots. One markup path; `/app/compare` and the quick-check modal are untouched.

`[ADDED]` **Always-visible ease-scale legend** (FOUNDER-REVIEW): runs from easiest to most effort; gold / teal / rose map to the three real color buckets; Charged named as the far end (most friction, not most spark). Words/bands still from `compatWord`; colors still from `compat-high|mid|low` CSS. No renames, no re-banding.
