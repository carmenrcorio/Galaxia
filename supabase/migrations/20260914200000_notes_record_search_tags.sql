-- Record search + curated tags.
--
-- Phase 0 (live eigfvribtntbxyjutsma, 2026-09-14):
--   notes.body is plaintext `text not null` (not encrypted at rest).
--   RLS: single policy "notes owner all" FOR ALL
--        using (owner_id = (select auth.uid()))
--        with check (owner_id = (select auth.uid()));
--        relrowsecurity = true, relforcerowsecurity = false.
--   Indexes: notes_pkey, notes_owner_id_idx, notes_about_person_created_at_idx,
--            notes_groups_current_roster_uidx. No FTS index.
--   8 rows. Server-side full-text search is possible because body is plaintext.
--
-- This migration adds the GIN index search needs and an optional curated tags
-- column. It does not drop, recreate, or alter "notes owner all".
-- Safe to apply via `supabase db push` / MCP apply_migration (transactional).
-- Does not need autocommit. CREATE INDEX CONCURRENTLY is forbidden here.

alter table public.notes
  add column if not exists tags text[] not null default '{}';

alter table public.notes drop constraint if exists notes_tags_allowed;

alter table public.notes
  add constraint notes_tags_allowed
  check (
    tags <@ array[
      'hard_conversation',
      'breakthrough',
      'conflict',
      'celebration',
      'pattern_noticed',
      'something_they_said'
    ]::text[]
  );

comment on column public.notes.tags is
  'Optional curated Record tags. Empty means untagged. Free-text tags are out of scope.';

create index if not exists notes_body_fts_idx
  on public.notes
  using gin (to_tsvector('english'::regconfig, body));

create index if not exists notes_tags_gin_idx
  on public.notes
  using gin (tags);
