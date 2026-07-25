## Groups: saved reload + persistent cohort reading (branch `cursor/fix-groups-saved-reload-00f7`) — 2026-07-25

**Trigger**: Tapping a saved group only mutated ephemeral React state and recomputed the cohort in memory; remount / kill-reopen / Record → Groups landed on an empty builder, and the reading was never a revisitable object.

`[ADDED]` **Migration `20260725013000_groups_current_cohort_reading_key.sql`.** `notes.member_set_hash` plus partial unique index on `(group_id, member_set_hash)` where `kind='cohort_reading'` and `payload.source='groups_current'`. Structural roster key — stale readings for a changed roster cannot match.

`[ADDED]` **`@galaxia/core` cohort-reading helpers.** `memberSetHash`, `buildGroupsCurrentPayload`, hydrate/select helpers, and `readyMembersForCohortOverlay` (empty/partial charts never reach `cohortOverlay`).

`[FIXED]` **loadGroup hydrates the same reading surface from `groups_current`.** Miss → compute + upsert. Generate upserts the current row. Web `/app/groups?groupId=` and mobile `groupId` search param run load on mount. Record “Open Groups →” carries `groupId` when present; person Record also surfaces membership cohort readings so the link is reachable.

`[CONFIRMED UNTOUCHED]` **vela-chat edge minor gate** and Ask Vela entry points. No new Vela path; edge remains the consumer-side minor gate for group content.

**Requires after merge:** `ship.sh` / `supabase db push` for the unique index. MERGED IS NOT LIVE.
