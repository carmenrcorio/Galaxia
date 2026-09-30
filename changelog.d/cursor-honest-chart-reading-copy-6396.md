## Honest blog chart-reading copy (branch `cursor/honest-chart-reading-copy-6396`) — 2026-09-30

**Trigger**: The blog capture form promised a birth-time reading (rising sign, houses, and a more accurate chart from place) that `buildChartReading` does not compute. Place is not geocoded.

`[FIXED]` **The helper under the birth fields no longer promises rising sign, houses, or birth-time precision.** It now says the reader can enter a birthday and receive a look at what the chart says. The birth-time help blurb is gone, because the form has no birth-time field and the old line said exact time and place make the chart more accurate.

`[CHANGED]` **Birth place stays on the form.** A non-empty place is what selects the reader's date-only chart instead of the published sample. The city string is not geocoded and the copy does not say it improves the chart. The capture route still accepts `birthPlace`.

`[OPEN]` **A month, day, and year with no place still emails the 29 December 1987 Little Rock sample.** Marked with a TODO on `buildChartReading`. Not rebuilt in this change.
