## Home "Today in your sky" is now per-person (branch `cursor/fix-home-transit-per-person-b2a6`) — 2026-07-12

**Trigger**: On the home dashboard, "Today in your sky" surfaced only a single
transit line (the signed-in person's tightest hit) plus name-only pills for
everyone else, so every person read as sharing one unpersonalized transit —
undermining the "real data, not AI guessing" promise on the most-seen screen.

`[FIXED]` **Home "Today in your sky" now renders one row per person, each
computed against that person's OWN natal chart.** The per-person `computeTransits`
loop already existed but its result was collapsed to the self's headline; the UI
now shows every person's real top transit and orb (or an honest hedge — "birth
year only", "no birth data yet", "no tight transits today" — never a fabricated
transit, per §12). Two people share a transit line only when it is genuinely,
computationally true for both.

`[CHANGED]` **Extracted `apps/web/lib/transits.ts` (`todayTransitsForChart`,
`describeTransit`) as the single source of truth for "today's transits".** The
person page's "Active today" now uses it too, so the home dashboard and the
person page can never disagree about a person's active transits. Same policy
applied to the Expo mobile home (`apps/mobile/app/index.tsx`).

`[ADDED]` **Astro regression tests** proving distinct charts produce distinct
top transits/orbs, identical charts match exactly, and the shared helper skips
year-only charts (ground truth, not self-consistency — §8/§12).
