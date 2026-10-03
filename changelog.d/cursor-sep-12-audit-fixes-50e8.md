## Sep 12 platform audit fixes verified (branch `cursor/sep-12-audit-fixes-50e8`) — 2026-10-03

**Trigger**: Confirm the Sep 12 audit items (purge FK gap, RLS auth.uid() wrap, owner/thread indexes) stay true after every committed migration replays on fresh Postgres.

`[ADDED]` **`sep-12-platform-audit-after-replay.test.ts`** — after full migration replay, asserts `people_owner_id_idx`, `notes_owner_id_idx`, and `messages_thread_id_idx` exist and no public RLS policy uses bare `auth.uid()` in qual or with_check. Purge behavior remains covered by `purge-own-account-data.test.ts`; the Sep 13 migration sources remain guarded by `rls-indexes-purge-migrations.test.ts`.
