# Galaxia — Natal Chart Standard (Astrologer's Bar)

## 0. The mindset

Galaxia's core promise is "real astrology, real data, not AI making things up." That promise only holds if the chart is as complete and accurate as the professional sites astrology-literate people already trust (Astrolabe / alabe.com, Cafe Astrology, astro.com). Those users WILL cross-check a chart they care about against astro.com. If the rising sign, a house placement, or a planet's degree disagrees, we are dismissed as a toy, exactly what happened to the apps that ship pretty but thin charts.

So the bar is two-sided:
1. **Match the professionals on computation.** Same conventions, same completeness, same accuracy. Never fewer bodies or points than Cafe Astrology shows.
2. **Beat them on legibility and relationships.** They are complete but dry and single-person. Our edge is warm plain-language interpretation, plus synastry, the generational layer, and Vela. We are the only one that turns a complete chart into something relational and usable.

A chart that is complete but cold is Cafe Astrology. A chart that is warm but thin is Co-Star. Galaxia is complete AND warm AND relational. Clicking a person shows the FULL chart, collapsible, not a handful of callouts.

## 1. Accuracy conventions (match astro.com so cross-checks pass)

- **Zodiac:** Tropical (what all three reference sites default to).
- **House system:** **Placidus by default**, because that is what Astrolabe and Cafe Astrology default to and what the user will compare against. Offer Whole-Sign and Equal as options in settings, but the default must match the reference sites or houses will "look wrong." (Current engine appears to use whole-sign; this is the single most important correctness change.)
- **Lunar Node:** True Node by default (Cafe Astrology default), with Mean Node as an option. Show both North and South Node.
- **Orbs:** Use standard orbs and state them (e.g., conjunction/opposition/trine/square ~6-8°, sextile ~4-6°, minor aspects ~2-3°). Match Cafe Astrology's defaults closely so the aspect list agrees.
- **Precision target:** every planet longitude within ~0.1° of astro.com; Ascendant/MC within ~0.5°. Add a test that compares a few known charts (including the owner's) against astro.com values and fails if off.

## 2. Completeness: everything a chart must compute

The engine must compute and the profile must be able to show ALL of the following. This is the gap list against Cafe Astrology.

**Bodies (have most):** Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto. Each with: exact ecliptic longitude, sign, degree°minute', house, and **retrograde flag** (missing today, add it).

**Points and bodies to ADD (missing today):**
- **Chiron** (expected on both reference sites).
- **North Node and South Node** (True Node default).
- **Lilith** (Black Moon Lilith, mean lunar apogee).
- **Ascendant (Rising)** and **Midheaven (MC)** as chart angles, plus **IC** and **Descendant**.
- Optional, phase 2: Part of Fortune, Vertex, and the major asteroids (Ceres, Pallas, Juno, Vesta) as a toggle, since Cafe Astrology offers these.

**Houses:** all 12 cusps with sign and degree°minute', in Placidus. For each house, its natural meaning and the sign/ruler on the cusp.

**Aspects:** a full aspect set between all bodies and angles, each with the aspect type, exact orb, and applying/separating. Include majors (conjunction, sextile, square, trine, opposition) and the common minors (quincunx, semisextile) at tighter orbs.

**Balances and patterns (missing, add):**
- Element balance (fire / earth / air / water counts and which is dominant/lacking).
- Modality balance (cardinal / fixed / mutable).
- Dominant planet / dominant sign.
- Stelliums (3+ bodies in one sign or house).
- Chart shape (bundle, bowl, bucket, locomotive, splash, etc.) — nice-to-have, phase 2.

## 3. The Chiron / ephemeris problem (do this without AGPL)

astronomy-engine (MIT, what the project uses) covers Sun-Pluto and gives sidereal time + obliquity for the angles and Placidus cusps, but it does NOT include Chiron or asteroids. The professional sites get Chiron from the Swiss Ephemeris, which is AGPL, the license the project deliberately avoided.

Resolve it without AGPL entanglement:
- **Nodes and Lilith:** formula-based (mean node / true node from the Moon's osculating orbit; Lilith = mean lunar apogee). Compute directly in `@galaxia/astro`. No new dependency, no license issue.
- **Placidus cusps:** computable in pure TypeScript from RAMC, obliquity, and geographic latitude (standard iterative Placidus algorithm). No new dependency.
- **Chiron:** embed a precomputed Chiron ephemeris data table (sampled positions 1900-2100, interpolate between samples). Data tables are not AGPL-encumbered the way the Swiss Ephemeris code is, so this keeps the MIT/no-AGPL stance while matching the reference sites on Chiron. Alternative if you accept a server-only dependency: compute Chiron in a server-side function; but the data-table route is cleanest and keeps it in the shared engine.

## 4. Presentation: the full chart, collapsible (this is the "click a name" fix)

When you open a person (`/app/person/[id]`), render the COMPLETE chart, organized into collapsible sections. The Big Three is expanded by default; everything else is collapsed but present. Add an "Expand all / Collapse all" control. Never show only a few callouts.

Section order:
1. **Header** — name, relationship, birth date/time/place, and a note if time is unknown (which sections are unavailable). Optional chart wheel graphic.
2. **The Big Three** (expanded by default) — Sun, Moon, Rising, each with sign, one-line meaning, and expand-for-full-paragraph.
3. **Planets & Points** (collapsible) — a clean table/list of every body and point from Section 2: glyph, body name, sign + degree°minute', house, retrograde marker, and a one-line interpretation, each row expandable to the full planet-in-sign and planet-in-house reading. Order: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, Chiron, North Node, South Node, Lilith, then Ascendant, MC.
4. **Houses** (collapsible) — all 12 cusps with sign + degree, the sign's ruler, and what that house governs, with the planets that fall in each house listed under it.
5. **Aspects** (collapsible) — the full aspect list (or grid), each with type, orb, applying/separating, and a plain-language interpretation of what that aspect means for this person.
6. **Balances & Patterns** (collapsible) — element and modality balance with a short read, dominant planet/sign, any stelliums, chart shape.

Every placement uses the proper glyph (♄ Saturn in Pisces, not "SATURN Pisces 16.8°") and the element colors for the glyph tint (fire/earth/air/water). Degrees shown as 16°48' style, with raw decimal behind a "show precise degrees" toggle.

## 5. Interpretation layer (the warm text that makes it legible)

To be as thorough as Cafe Astrology without inventing anything, ship a curated static interpretation library (no LLM in the chart itself; Vela is the conversational layer on top). Needed dictionaries:
- Planet-in-sign (~120 entries: 10 bodies + points × 12 signs).
- Planet-in-house (~120 entries).
- Rising/Ascendant sign (12) and MC sign (12).
- Aspect interpretations (templated by aspect type + the two bodies, with hand-written copy for the most important pairs like Sun-Moon, Moon-Venus, Venus-Mars, Saturn-personal-planets).
- House-on-sign cusp meanings and house significations.

Voice: warm, specific, second-person, plain language, never fatalistic or cruel (the anti-Co-Star rule). Each entry has a one-liner (shown collapsed) and a fuller paragraph (shown expanded). This copy is a brand asset and should be written in Galaxia's voice, not generated generically.

## 6. Accuracy prerequisite (why the chart is wrong today)

None of this is trustworthy until birth time is handled correctly: the birth place must be geocoded to lat/long and the local birth time converted to UTC using that place's historical timezone (including DST). This is the geocoding/timezone fix already scoped separately; it is a hard prerequisite for houses, Ascendant, and any time-sensitive point. A complete-looking chart built on UTC-as-local is confidently wrong, which is worse than an incomplete one.

## 7. Acceptance criteria

- Opening a person shows the FULL chart in collapsible sections, not a few callouts, with Big Three expanded and everything else present.
- The chart includes Chiron, North & South Node, Lilith, Ascendant, MC, all 12 Placidus house cusps, retrograde flags, a full aspect list with orbs, and element/modality balance.
- The owner's own chart, and at least two known reference charts, match astro.com to within ~0.1° on planets and ~0.5° on the Ascendant, using Placidus + True Node + tropical.
- Every placement has a plain-language interpretation from the curated library; raw degrees are available but not in the way.
- If birth time is unknown, the chart clearly shows what it can (signs, some aspects) and what it cannot (houses, Ascendant, Moon-degree-sensitive detail) instead of silently guessing.
