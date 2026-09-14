## Transaction-safe people/notes/messages indexes (branch `cursor/fix-index-concurrently-4764`) — 2026-09-14

**Trigger**: `20260914023000_people_notes_messages_indexes.sql` used `CREATE INDEX CONCURRENTLY`. Postgres forbids that inside a transaction, and both apply paths this repo uses (`supabase db push`, MCP `apply_migration`) wrap each file in one, so the file could not be applied.

`[FIXED]` **Same five indexes, transactional form** (`20260914023000_people_notes_messages_indexes.sql`): `CREATE INDEX IF NOT EXISTS` (no `CONCURRENTLY`) for `people(owner_id)`, `notes(owner_id)`, `messages(thread_id)`, `notes(about_person, created_at DESC)`, and `messages(thread_id, created_at DESC)`. Comments still name the restriction so it is not reintroduced.

`[ADDED]` **Idempotent follow-up** (`20260914130000_people_notes_messages_indexes_txn.sql`): the same `CREATE INDEX IF NOT EXISTS` statements, for databases that already recorded `20260914023000` in the ledger (name-only / no statements) before the transactional form existed. No-op where the names already landed. No RLS changes.
