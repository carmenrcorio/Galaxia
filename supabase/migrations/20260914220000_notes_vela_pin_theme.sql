-- Optional curated theme on pinned Vela insights.
--
-- Phase 0 (live eigfvribtntbxyjutsma, 2026-09-14):
--   Pins are notes.kind = 'vela_pin'. Zero vela_pin rows in production.
--   Columns: id, owner_id, about_person, pair_low, pair_high, body,
--            transit_snapshot, created_at, group_id, kind, payload,
--            source_thread_id, withdrawn_at, withdrawn_reason,
--            member_set_hash, tags. No theme, topic, or source field
--            (source_thread_id is a conversation FK, not a topic).
--   RLS: single policy "notes owner all" FOR ALL
--        using (owner_id = (select auth.uid()))
--        with check (owner_id = (select auth.uid()));
--        relrowsecurity = true, relforcerowsecurity = false.
--
-- This migration adds notes.theme. It does not drop, recreate, or alter
-- "notes owner all". Theme is owner-private with the existing row policy.
-- Safe to apply via `supabase db push` / MCP apply_migration (transactional).
-- Does not need autocommit. CREATE INDEX CONCURRENTLY is forbidden here.

alter table public.notes
  add column if not exists theme text;

alter table public.notes drop constraint if exists notes_theme_allowed;

alter table public.notes
  add constraint notes_theme_allowed
  check (
    theme is null
    or (
      kind = 'vela_pin'
      and theme = any (
        array[
          'how_theyre_built',
          'how_you_two_work',
          'this_season',
          'talking',
          'tension',
          'care',
          'family',
          'work'
        ]::text[]
      )
    )
  );

comment on column public.notes.theme is
  'Optional curated theme on a vela_pin. NULL means unthemed. Runtime code never invents ids outside this list.';

create index if not exists notes_vela_pin_theme_idx
  on public.notes (owner_id, theme)
  where kind = 'vela_pin' and theme is not null;
