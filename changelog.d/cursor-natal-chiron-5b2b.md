## Chiron as a natal placement (branch `cursor/natal-chiron-5b2b`) - 2026-09-26

**Trigger**: The natal chart computed Sun-Pluto and True Node, but Chiron (expected on Cafe Astrology / astro.com) was still a documented gap. Swiss Ephemeris stays out (AGPL).

`[ADDED]` **Embedded Chiron table in `@galaxia/astro`.** `computeNatalChart` now places `chiron` after North Node on date and exact charts (sign, house when birth time is known, retrograde). Year-only charts include the mid-year sign, no house. Longitude is a 10-day JPL Horizons ecliptic-of-date table (1900-01-01 through 2101-01-15) with linear interpolation. Dates outside the table omit Chiron rather than guess. astronomy-engine has no `Body.Chiron`; this is not `BODY_MAP`.

`[ADDED]` **Natal card + synastry aspects.** Web and mobile chart views render a Chiron card after North Node (glyph ⚷). Domain line is "Where healing and vulnerability meet" (`FOUNDER-REVIEW`). Sign / house / natal pair / synastry pair copy is not authored this pass: `interpretPlacement` and `interpretAspect` stay empty/null for Chiron; synastry falls back to `ASPECT_NATURE`. Transits, daily nudges, and element-balance tallies stay planetary so existing planet longs, transit hits, and element counts do not shift.
