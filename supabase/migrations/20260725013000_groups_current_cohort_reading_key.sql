-- Roster-keyed current cohort readings for Groups.
-- Key: (group_id, member_set_hash) where kind='cohort_reading' and
-- payload.source='groups_current'. A changed roster cannot match a stale row.

alter table notes add column if not exists member_set_hash text;

comment on column notes.member_set_hash is
  'Sorted-member fingerprint for cohort_reading rows (groups_current). Used with group_id as the structural current-reading key.';

-- One current Groups reading per group + roster. Partial so dated snapshots and
-- vela_cohort_current rows (null / other source) are unaffected.
create unique index if not exists notes_groups_current_roster_uidx
  on notes (group_id, member_set_hash)
  where kind = 'cohort_reading'
    and group_id is not null
    and member_set_hash is not null
    and (payload->>'source') = 'groups_current';
