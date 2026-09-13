## Indexes, RLS auth.uid wrap, and account-purge FK gap (branch `cursor/rls-indexes-purge-ab7d`) — 2026-09-13

**Trigger**: production was missing owner/thread indexes, 31 RLS policies still called bare `auth.uid()` per row, and `purge_own_account_data()` could not drop `auth.users` because leftover `thread_participants.user_id` and `admin_audit_log` NO ACTION FKs blocked the delete. A prior version of the function did delete `thread_participants`; a later `CREATE OR REPLACE` dropped that line.

`[ADDED]` **Owner and thread indexes** (`20260913030000_add_owner_and_thread_indexes.sql`): `people(owner_id)`, `notes(owner_id)`, `messages(thread_id)`, `thread_participants(user_id)`, `thread_participants(thread_id)`. The last two cover the messages RLS `EXISTS` subquery. Not `CONCURRENTLY` (supabase db push wraps migrations in a transaction).

`[CHANGED]` **31 RLS policies** (`20260913030100_wrap_auth_uid_in_rls_policies.sql`): every `auth.uid()` inside USING / WITH CHECK is now `(select auth.uid())`. Names, roles, commands, and predicates are otherwise unchanged.

`[CHANGED]` **`admin_audit_log.actor_id` is nullable** (`20260913030150_admin_audit_log_actor_id_nullable.sql`) so purge can keep the audit row instead of deleting it. `target_user_id` was already nullable.

`[FIXED]` **`purge_own_account_data()` FK gap** (`20260913030200_fix_purge_account_thread_participants.sql`): deletes `thread_participants` for the caller before owned threads, then nulls `admin_audit_log.actor_id` and `target_user_id`. Audit history is preserved. Nothing else in the function body changed.
