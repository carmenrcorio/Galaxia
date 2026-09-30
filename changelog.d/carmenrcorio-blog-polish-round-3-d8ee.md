## Blog polish, round 3

`[CHANGED]` Post header is one line: **By Galaxia · Updated {date} · {n} min read**. The date is `updated_at` (or `published_at` when that is empty), wrapped in `<time>`. The two-name byline, the bio paragraph, and the bare method link are gone. One intro note under the byline links to `/method`.

`[CHANGED]` Every post gets one closing call to action. Timely posts and three sensitive posts use the approved body variants. One inline “See how this plays out in your own chart →” link sits after the first section that explains the chart idea. The three sensitive posts have no inline link.

`[CHANGED]` The chart-reading helper under the birth fields is “We calculate the chart from the date you enter.” The form collects a date and an optional place, not a birth time. The memorial closer does not ask for a birth time.

`[CHANGED]` Figure text-description toggles use a dark-theme `<details>` with a cream label, gold marker, and gold focus ring.

`[ADDED]` Migration `20260930145501_blog_polish_round_3.sql` sets `byline` to `By Galaxia`, clears the grandmother post’s About Galaxia tag so it shows as Learn, and removes duplicate end-of-post pitches. It does not change stored dates. Not applied.
