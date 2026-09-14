-- The Moment: reuse notes. No parallel store, no RLS change.
--
-- Phase 0 (live eigfvribtntbxyjutsma, 2026-09-14, after Record search + pin theme):
--   notes already has about_person (linked person), transit_snapshot jsonb,
--   tags (curated journal list), kind, payload, owner_id.
--   RLS: single policy "notes owner all" FOR ALL
--        using (owner_id = (select auth.uid()))
--        with check (owner_id = (select auth.uid()));
--   This migration adds kind='moment' and one tag id. It does not drop,
--   recreate, or alter "notes owner all".
-- Safe to apply via `supabase db push` / MCP apply_migration (transactional).
-- Does not need autocommit. CREATE INDEX CONCURRENTLY is forbidden here.

alter table public.notes drop constraint if exists notes_kind_check;

alter table public.notes add constraint notes_kind_check
  check (kind in (
    'note',
    'tending',
    'vela_pin',
    'compare_reading',
    'cohort_reading',
    'remembrance',
    'chart_correction',
    'moment'
  ));

comment on constraint notes_kind_check on public.notes is
  'Record kinds. moment = owner-initiated sixty-second loop with a stored transit snapshot.';

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
      'something_they_said',
      'silence_needed_filling'
    ]::text[]
  );
