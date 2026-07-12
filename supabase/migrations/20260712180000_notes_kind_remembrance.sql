-- Remembrance Phase 2: private owner reflections about a remembered person.
-- Extends the existing `notes` store (owner-only RLS) with kind 'remembrance'.
-- Framing is REMEMBRANCE — never clinical "deceased/dead."

alter table notes drop constraint if exists notes_kind_check;

alter table notes add constraint notes_kind_check
  check (kind in ('note', 'tending', 'vela_pin', 'compare_reading', 'cohort_reading', 'remembrance'));

comment on constraint notes_kind_check on notes is
  'Record kinds. remembrance = owner-only reflections on a passed person (Phase 2). Same owner RLS as all notes.';
