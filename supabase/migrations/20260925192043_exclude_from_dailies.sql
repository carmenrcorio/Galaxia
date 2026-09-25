-- Opt-out of Today / daily-note surfaces for a living person.
-- Default false: everyone stays in the daily sky unless the owner turns this on.
-- Remembered people are already excluded via peopleForTodaySky (passed_at).
-- This Week, Sunday letter, and constellation lines are unchanged.
alter table public.people
  add column if not exists exclude_from_dailies boolean not null default false;

comment on column public.people.exclude_from_dailies is
  'When true, this living person is left out of Today in your sky and the morning daily note. Default false. Does not affect This Week, the Sunday letter, or the constellation. Remembered people are already excluded via passed_at.';
