-- Secondary indexes for owner-scoped people/notes lookups and thread-scoped
-- messages. CREATE INDEX CONCURRENTLY cannot run inside a transaction block,
-- so this file must not be applied by a runner that wraps the migration in a
-- transaction (`supabase db push`, MCP apply_migration). Apply with autocommit
-- (psql, or the Dashboard SQL editor with "Run as transaction" off), one
-- statement at a time. IF NOT EXISTS is safe if 20260913030000 already created
-- the three single-column indexes without CONCURRENTLY.
--
-- Row counts on 2026-09-14 (eigfvribtntbxyjutsma): people 47, notes 8,
-- messages 92. A concurrent build is not required for lock duration at this
-- size; CONCURRENTLY is the required form for this file regardless.

create index concurrently if not exists people_owner_id_idx
  on public.people (owner_id);

create index concurrently if not exists notes_owner_id_idx
  on public.notes (owner_id);

create index concurrently if not exists messages_thread_id_idx
  on public.messages (thread_id);

-- Mobile person profile: notes.eq("about_person").order("created_at").
-- Also covers the unindexed notes_about_person_fkey.
create index concurrently if not exists notes_about_person_created_at_idx
  on public.notes (about_person, created_at desc);

-- Constellation thread chips, Vela history, and Record thread preview:
-- messages filtered by thread_id and ordered by created_at.
create index concurrently if not exists messages_thread_id_created_at_idx
  on public.messages (thread_id, created_at desc);
