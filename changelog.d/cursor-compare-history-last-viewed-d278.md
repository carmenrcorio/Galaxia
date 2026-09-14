## Compare history and what changed since last viewed (branch `cursor/compare-history-last-viewed-d278`) — 2026-09-14

**Trigger**: Compare landing was always an empty form. Nothing recorded which pair a returning user last opened, so there was no way to lead with what had moved in the sky.

`[DECISION]` **Phase 0: do not persist the rendered comparison.** `synastry.data` exists but is never written by Compare. `notes.kind = compare_reading` is an explicit "Save this reading" snapshot of scores and top aspects, not a view ledger. `quick_share_snapshots` freeze a share token. Transit hits for a pair come from `computeTransits(natal, whenUTC)` against each stored natal (same 1.5° orb as "Active today"). Natal synastry is constant. Recompute on open.

`[ADDED]` **`comparison_history` table**: `owner_id`, ordered `person_low` / `person_high`, `last_viewed_at`. No jsonb reading payload. Unique per owner+pair. Owner-only RLS (`(select auth.uid())`). Authenticated grant only. Cleared by `purge_own_account_data` and `delete_own_person`. Cross-user SELECT is denied (local replay + `docs/comparison-history-rls-retest.sql`).

`[ADDED]` **Recent comparisons on `/app/compare` and mobile Compare.** Names and last viewed date. Opening a row recomputes synastry. Upsert of last viewed happens after the previous timestamp is read, so the delta can use it.

`[ADDED]` **Since you last looked.** Newly active vs moved-on transits between the two people, recomputed at last viewed vs now. Natal aspects are stated once as unchanged. Year-only charts stay silent rather than inventing orbs. Remembrance profiles are omitted from live transits. Every user-visible string tagged FOUNDER-REVIEW. No U+2014.
