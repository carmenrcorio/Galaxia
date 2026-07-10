-- R1: the Relationship Record. `notes` becomes the single timeline store for
-- every scope (person / pair / group). It already has owner_id, about_person,
-- pair_low, pair_high, transit_snapshot, created_at and the correct owner-only
-- RLS — so we extend it rather than create a second store with duplicate rules.
alter table notes add column if not exists group_id uuid references groups(id) on delete cascade;
alter table notes add column if not exists kind text not null default 'note'
  check (kind in ('note', 'tending', 'vela_pin', 'compare_reading', 'cohort_reading'));
-- payload carries the immutable computed snapshot for saved readings
-- (scores, aspects, overlay) + engine_version + a birth-data fingerprint so a
-- later re-run difference can be attributed to an input change, never dressed
-- up as a relationship "trend" (computeSynastry is deterministic).
alter table notes add column if not exists payload jsonb;
alter table notes add column if not exists source_thread_id uuid references threads(id) on delete set null;
