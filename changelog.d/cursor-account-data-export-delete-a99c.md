## Self-serve data export and account deletion (branch `cursor/account-data-export-delete-a99c`) — 2026-07-23

**Trigger**: `/account/data` was mailto-only for export and delete; Settings had no path to either.

`[ADDED]` **Atomic `purge_own_account_data()` SECURITY DEFINER RPC** that deletes the caller's owned graph in one transaction (order verified against live FK NO ACTION rules, including `transits`). App calls `auth.admin.deleteUser` only after the RPC succeeds. Partial deletion is impossible.

`[ADDED]` **`quick_share_snapshots.created_by`** (nullable, ON DELETE CASCADE). Set on insert when the request has a session; anonymous funnel inserts stay null. Delete copy is honest: only signed-in links created from now on are cleared; pre-existing anonymous snapshots cannot be attributed and may keep resolving.

`[ADDED]` **`GET /api/account/export`** and **`POST /api/account/delete`**, plus self-serve UI on `/account/data` (linked from `/app/settings`). Export is real owned rows only (safe profile fields, people, charts, relationships, groups, group_members, synastry, notes, threads, messages). Delete requires typing `delete`. Active / past_due / lifetime shows a cancel-first billing warning (warn only; no RevenueCat/Stripe calls on the delete path).
