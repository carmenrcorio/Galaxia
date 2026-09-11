## Houses explanation card for year-only charts (branch `cursor/houses-unavailable-year-only-0f96`) — 2026-09-11

**Trigger**: A date-precision chart without houses got a dashed explanation card on the person page; a year-only chart took the `: null` branch and left a blank gap. `/api/quick-chart` accepts precision year (a 1950 year-only compute returns placements with `cusps` false), so the public Quick Chart path hit the hole even though production people are date or exact today.

`[FIXED]` **Year-only natal readings now show the houses explanation card instead of a blank gap.** Date precision still needs a birth time; year-only needs a birth date and a time. Copy names that reason per precision and does not imply the chart is wrong: nothing is missing from the reading; less was known. Exact-without-place (time known, no city) gets its own line so it is not told it still needs a time.

`[ADDED]` **`HousesUnavailableCard` is the single houses-unavailable surface.** Person page (`/app/person/[id]`), Quick Chart (`/chart`), and single share snapshots (`/s`) all mount it and pass `hasHouses`. The card renders nothing when cusps are present, so a second surface cannot forget year-only. FOUNDER-REVIEW on the new strings; no U+2014.
