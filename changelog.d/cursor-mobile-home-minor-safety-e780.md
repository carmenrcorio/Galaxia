## Hotfix: mobile home sky gates minors + active-thread filter (branch `cursor/mobile-home-minor-safety-e780`) — 2026-07-24

**Trigger**: Mobile home rendered per-person transit copy without loading
`is_minor` / `birth_date`, so `isMinorForSafety` could not run — breaking the
universal minor-safety rule on a shipped surface. Web home already gated.
Archived Vela threads could also surface in Resume (web filters `status='active'`).

`[FIXED]` **Mobile home "Today in your sky" now loads `is_minor`, `birth_date`,
and `relation`, calls `isMinorForSafety`, and renders via shared
`interpretTransit(..., { minorSafe })` + `transitNotation`** — same path as web
home. No mobile-only safe-copy variant. (Before: mechanical `describeTransit`
with no safety gate; web already used `interpretTransit`.)

`[FIXED]` **Mobile home threads query filters `status='active'`** so archived
threads no longer appear under Jump back in.

`[OPEN]` **Other mobile surfaces still render person content without the safety
call:** `profile/[personId].tsx` (natal / generational copy) and `groups.tsx`
(cohort / shared-sky / fault-line content). Not fixed in this branch.
`compare.tsx` and `vela.tsx` already gate via `isMinorForSafety`.

`[VERIFIED]` **"No tight transits today" on the You row is correct behavior, not
a bug** (2026-07-24). Self reaches the same charts fetch +
`todayTransitsForChart` as everyone else (keyed by self person id; profiles are
welcome-name only). Self chart is exact / engine_version 2 / 10/10 confident.
Exactly one `is_self` (Carmen); Carmen Sofia is Daughter. On that day self had
16 raw hits and **0 ≤1.5°** (closest ~2.05°); other living people had multiple
tight hits. The 1.5° orb stays — tightness is what makes a hit mean something.

`[OPEN]` **Empty state is still the worst UX on the surface** — You is the
first row opened daily, and every other person shows three hits beside a blank
self line. Product decision (do not loosen the orb): when a person has zero
hits at 1.5°, show the nearest approaching aspect with its real orb and honest
not-tight-yet framing. Curated static copy, one entry per transit pair +
harmony, same library pattern as tight hits; FOUNDER-REVIEW on those strings.
If nothing is within a sensible outer bound either, say the sky is quiet in a
way that reads as information rather than absence. Applies to every person's
row (web + mobile), not just self. Tracked in Backlog:
https://app.notion.com/p/3a7e72e462d981d8904bf59dc3279156
