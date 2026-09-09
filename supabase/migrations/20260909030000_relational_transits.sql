-- Generations Feature 3: Generational Transit Alerts.
--
-- One row per scanned relational transit: a single slow-moving outer body
-- (Jupiter/Saturn/Uranus/Neptune/Pluto) forming the SAME aspect to 2+
-- people in an owner's constellation within the same real active window.
-- Computed and upserted by @galaxia/astro `scanRelationalTransits` — this
-- table only ever stores the engine's output, never a hand-authored guess.
-- affected_profiles is jsonb (not a join table) because the scan already
-- resolves everything needed to render a card (name, natal body/sign, orb,
-- exact date) at write time — same "freeze the read" convention as
-- person_daily_nudges.copy_resolved.

create table if not exists relational_transits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  transit_body text not null check (transit_body in ('jupiter', 'saturn', 'uranus', 'neptune', 'pluto')),
  transit_sign text not null,
  aspect_type text not null check (aspect_type in ('conjunction', 'sextile', 'square', 'trine', 'opposition')),
  -- [{ profile_id, profile_name, natal_body, natal_sign, orb_deg, exact_at }, ...] — 2+ entries.
  affected_profiles jsonb not null,
  active_from timestamptz not null,
  active_to timestamptz not null,
  -- @galaxia/astro relationalTransitDedupKey(event): stable across
  -- consecutive daily re-scans of the same real pass, so the job can
  -- upsert instead of accumulating duplicate rows for one event.
  dedup_key text not null,
  created_at timestamptz not null default now(),
  unique (owner_id, dedup_key)
);

comment on table relational_transits is
  'Owner-scoped relational transit alerts (Generations Feature 3): one row per real (transit_body, aspect_type) pass that hit 2+ people in the constellation within the same window, computed by @galaxia/astro scanRelationalTransits and upserted daily on dedup_key.';

create index if not exists relational_transits_owner_active_idx
  on relational_transits (owner_id, active_to desc);

alter table relational_transits enable row level security;

-- Owner-only, same shape as person_daily_nudges: no cross-user read/write.
-- Writes come from the service-role cron route (apps/web/app/api/cron/
-- relational-transit-scan), which bypasses RLS; this policy exists for any
-- future client-side read/write and to make the table safe by default.
create policy "relational_transits owner all"
on relational_transits for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

-- Owner preference for relational transit alerts, mirroring
-- daily_nudge_emails_enabled's column-grant pattern (profiles RLS is
-- row-level only — id = auth.uid() — so this only needs extending the
-- existing write grant, no new row policy). 'all' (default) | 'major_only'
-- (Saturn/Uranus/Pluto only, per spec) | 'off'.
alter table public.profiles
  add column if not exists relational_transit_alerts text not null default 'all'
    check (relational_transit_alerts in ('all', 'major_only', 'off'));

comment on column public.profiles.relational_transit_alerts is
  'Owner preference for Generational Transit Alerts (Feature 3): all (default), major_only (Saturn/Uranus/Pluto), or off. Gates both the in-app "This Week" feed and any push notification for new relational transits; the daily scan itself still runs and stores rows regardless, so switching back to "all" immediately surfaces the full recent history.';

revoke insert on table public.profiles from anon, authenticated;
revoke update on table public.profiles from anon, authenticated;

grant insert (id, display_name, house_system, timezone, daily_nudge_emails_enabled, relational_transit_alerts)
  on table public.profiles to authenticated;
grant update (id, display_name, house_system, timezone, daily_nudge_emails_enabled, relational_transit_alerts)
  on table public.profiles to authenticated;

-- ─── Additive-only edits to the shared owner-delete functions ──────────────
-- Same convention as 20260909020000_memorial_milestones.sql: every existing
-- statement is unchanged, new statements are added, no signature change.
-- relational_transits.owner_id has no FK to people (it references
-- auth.users only — affected_profiles is jsonb, not a foreign key), so a
-- single person delete never needs to touch this table; only account purge
-- does.

create or replace function public.purge_own_account_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  update people set linked_user_id = null where linked_user_id = uid;

  delete from notes where owner_id = uid;

  update notes
    set about_person = null
    where about_person in (select id from people where owner_id = uid);

  delete from synastry where owner_id = uid;
  delete from relationships where owner_id = uid;

  delete from person_daily_nudges
    where person_id in (select id from people where owner_id = uid)
       or owner_id = uid;

  delete from daily_nudge_emails where owner_id = uid;

  delete from memorial_milestones
    where profile_id in (select id from people where owner_id = uid)
       or user_id = uid;

  -- New: relational_transits.owner_id only (no people FK — see header).
  delete from relational_transits where owner_id = uid;

  delete from transits
    where person_id in (select id from people where owner_id = uid);

  delete from group_members
    where person_id in (select id from people where owner_id = uid);

  delete from group_members
    where group_id in (select id from groups where owner_id = uid);

  delete from threads where owner_id = uid;

  update threads
    set subject_person = null
    where subject_person in (select id from people where owner_id = uid);

  update threads
    set group_id = null
    where group_id in (select id from groups where owner_id = uid);

  delete from groups where owner_id = uid;

  -- Clear pin before people delete (FK ondelete set null also covers this).
  update profiles set pinned_sky_person_id = null where id = uid;

  delete from people where owner_id = uid;

  delete from trial_emails where user_id = uid;
  delete from invites where from_user = uid;

  delete from support_requests where owner_id = uid;
  update support_requests set handled_by = null where handled_by = uid;

  delete from profiles where id = uid;
end;
$$;

comment on function public.purge_own_account_data() is
  'Deletes the caller''s owned graph (including person_daily_nudges, daily_nudge_emails, memorial_milestones, relational_transits, and support_requests) then the profile row. SECURITY DEFINER; auth.uid() only.';
