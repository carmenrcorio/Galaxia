-- Secondary indexes for owner-scoped people/notes lookups and thread-scoped
-- messages. CREATE INDEX CONCURRENTLY cannot run inside a transaction, and
-- every apply path this repo uses (`supabase db push`, MCP apply_migration)
-- wraps the file in a transaction. Use CREATE INDEX IF NOT EXISTS.
--
-- IF NOT EXISTS is a no-op if 20260913030000 already created the three
-- single-column indexes. The two composites are the new covering indexes.
-- Tables are small; a concurrent build is not needed for lock duration.

create index if not exists people_owner_id_idx
  on public.people (owner_id);

create index if not exists notes_owner_id_idx
  on public.notes (owner_id);

create index if not exists messages_thread_id_idx
  on public.messages (thread_id);

-- Mobile person profile: notes.eq("about_person").order("created_at").
-- Also covers the unindexed notes_about_person_fkey.
create index if not exists notes_about_person_created_at_idx
  on public.notes (about_person, created_at desc);

-- Constellation thread chips, Vela history, and Record thread preview:
-- messages filtered by thread_id and ordered by created_at.
create index if not exists messages_thread_id_created_at_idx
  on public.messages (thread_id, created_at desc);
