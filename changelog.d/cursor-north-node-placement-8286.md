## North Node (True Node) as a natal placement (branch `cursor/north-node-placement-8286`) — 2026-09-26

**Trigger**: The natal chart computed Sun–Pluto and the glossary already described the North Node, but the engine never calculated the point. ENGINEERING.md §8 names True Node as the convention users cross-check.

`[ADDED]` **True Node in `@galaxia/astro`.** `computeNatalChart` now places `north_node` after Pluto on date and exact charts (sign + house when birth time is known). Year-only charts omit it: the Node moves ~19°/year, so a year sample would be a guess. Computation is the osculating ascending node from astronomy-engine's geocentric Moon state in true ecliptic of date (no Swiss Ephemeris / AGPL). Mean Node is not offered.

`[ADDED]` **Natal card + synastry.** Web and mobile chart views render a North Node card (glyph ☊, sign, house, descriptor). Synastry aspects include the Node; Compare flows/catches has authored pair copy. Transits and element-balance tallies stay planetary so existing planet longs, transit hits, and element counts do not shift.

`[DECISION]` **Descriptor.** Domain line is "Where growth asks you to go" (`FOUNDER-REVIEW`). Sign and house lines, plus synastry pair copy, are tagged the same way. South Node, Chiron, and Lilith stay out of this pass.
