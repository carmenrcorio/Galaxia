-- Remembrance Phase 1: reversible "passed" state on a person.
-- Framing is REMEMBRANCE, never clinical "deceased/dead."
-- NULL means present; a timestamptz means remembered (when marked).
-- Clearing passed_at reverses the state. Chart rows are untouched.
alter table people
  add column if not exists passed_at timestamptz default null;

comment on column people.passed_at is
  'Remembrance: when this person was marked as having passed. NULL = present. Reversible. Does not affect chart data or minor safety.';
