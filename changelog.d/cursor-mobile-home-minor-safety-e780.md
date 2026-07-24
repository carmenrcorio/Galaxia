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
