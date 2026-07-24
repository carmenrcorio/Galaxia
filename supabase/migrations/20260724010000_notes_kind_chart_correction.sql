-- Chart correction Record entries: when a person-page engine backfill rewrites
-- natal placement longitudes (not house-only), we persist a dated note so the
-- mutation is never silent. Same owner-only RLS as all notes.

alter table notes drop constraint if exists notes_kind_check;

alter table notes add constraint notes_kind_check
  check (kind in (
    'note',
    'tending',
    'vela_pin',
    'compare_reading',
    'cohort_reading',
    'remembrance',
    'chart_correction'
  ));

comment on constraint notes_kind_check on notes is
  'Record kinds. chart_correction = dated notice that natal longitudes were rebuilt from stored birth fields (not a user edit).';
