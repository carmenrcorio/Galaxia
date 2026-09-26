## Public methodology page (branch `cursor/methodology-page-5bcd`) — 2026-09-26

**Trigger**: People who cross-check Galaxia against astro.com should be able to read the method we actually run: ephemeris, house system, orb table, and what we leave out. Publishing that is the never-fabricate rule applied to the product itself.

`[ADDED]` **`/methodology`.** Public page at `apps/web/app/methodology/page.tsx`. H1 is "How Galaxia computes your chart." Sections cover ephemeris source (`astronomy-engine`, MIT, tropical geocentric positions), Placidus as the default house system with Whole Sign / Equal as computed options and an explicit polar fallback, the live orb table from `aspectDefinition`, applying/separating for transits only, and an honest omissions list (Chiron, nodes, Lilith, minor aspects, Arabic parts, Vertex, sidereal). Orb numbers are imported from `@galaxia/astro`, not restated. All authored copy is tagged `FOUNDER-REVIEW`.

`[ADDED]` **Sitemap + cross-links.** `/methodology` is in `app/sitemap.ts`. `/glossary` and `/security` related-link rows now point at it. The page's own related links go to `/glossary`, `/security`, and `/why-galaxia`.

`[DECISION]` **One orb per aspect type, shown in three columns.** The engine does not widen orbs for luminaries. The requested Luminaries / Personal / Outer table therefore repeats the same allowance (conjunction 8°, sextile 4°, square 6°, trine 6°, opposition 8°). A transiting Moon is capped at 3°. Applying/separating is computed only in the transit-nudge engine (`phaseAt`), not on natal or synastry aspects.
