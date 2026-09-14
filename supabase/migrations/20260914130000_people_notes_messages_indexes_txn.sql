-- Transaction-safe restatement of the people/notes/messages indexes.
-- 20260914023000 originally used CREATE INDEX CONCURRENTLY, which cannot
-- run inside a transaction, so MCP apply_migration / db push cannot apply
-- that form. This file is CREATE INDEX IF NOT EXISTS (no CONCURRENTLY).
-- Idempotent if 20260914023000 already landed the same names, including on
-- databases that recorded that version in the ledger without a named row.

create index if not exists people_owner_id_idx
  on public.people (owner_id);

create index if not exists notes_owner_id_idx
  on public.notes (owner_id);

create index if not exists messages_thread_id_idx
  on public.messages (thread_id);

create index if not exists notes_about_person_created_at_idx
  on public.notes (about_person, created_at desc);

create index if not exists messages_thread_id_created_at_idx
  on public.messages (thread_id, created_at desc);
