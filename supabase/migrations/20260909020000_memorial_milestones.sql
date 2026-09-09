-- Generations Feature 1: Memorial Timeline.
--
-- Owner-added family milestones (marriage, births, moves, career changes...)
-- shown interleaved with the deterministically COMPUTED lifespan transits
-- (@galaxia/astro computeLifespanTransits — never stored, always derived on
-- the fly from the person's own chart) on a memorial profile's Timeline
-- section. This table only ever holds the human-authored side.

create table if not exists memorial_milestones (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references people(id),
  user_id uuid not null references auth.users(id),
  date date not null,
  title text not null check (char_length(title) <= 100),
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table memorial_milestones is
  'Owner-authored family milestones on a memorial profile''s Timeline (title max 100 chars, note max 500). Distinct from the computed lifespan transits, which are derived from the chart on request and never stored. profile_id is NO ACTION (matches notes/relationships/synastry/transits) — delete_own_person and purge_own_account_data below are updated to clear these rows explicitly.';

create index if not exists memorial_milestones_profile_date_idx
  on memorial_milestones (profile_id, date);

create index if not exists memorial_milestones_user_idx
  on memorial_milestones (user_id);

alter table memorial_milestones enable row level security;

-- Owner-scoped via the owned person — same hardened shape as
-- person_daily_nudges (20260726000000_person_daily_nudges_rls_hardening.sql):
-- user_id = auth.uid() AND the referenced person must belong to that owner,
-- so an authenticated caller can never attach a milestone to someone else's
-- constellation, and can never read another owner's milestones.
create policy "memorial_milestones owner all"
on memorial_milestones for all
using (
  user_id = auth.uid()
  and exists (
    select 1 from people p
    where p.id = memorial_milestones.profile_id
      and p.owner_id = auth.uid()
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1 from people p
    where p.id = memorial_milestones.profile_id
      and p.owner_id = auth.uid()
  )
);

create or replace function public.set_memorial_milestones_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists memorial_milestones_set_updated_at on memorial_milestones;
create trigger memorial_milestones_set_updated_at
before update on memorial_milestones
for each row execute function public.set_memorial_milestones_updated_at();

-- Optional, owner-recorded date of passing — distinct from `passed_at` (when
-- the remembrance toggle was flipped in-app, added in
-- 20260712153000_people_passed_at.sql). Never inferred from passed_at: a
-- family member marked "passed" today may have died decades ago, and
-- silently treating the toggle timestamp as the date of death would be
-- exactly the kind of fabricated fact ENGINEERING.md §12 forbids. NULL means
-- unknown; the Memorial Timeline hedges honestly when it is not set (no
-- "passing" marker, no lifespan-transit search past "today").
alter table people
  add column if not exists died_on date default null;

comment on column people.died_on is
  'Optional: the actual date this person died, as recorded by the owner. Distinct from passed_at (the in-app remembrance-toggle timestamp). Used only by the Memorial Timeline to bound the lifespan-transit scan and place the "passing" marker — never fabricated from passed_at or any other field.';

-- ─── Additive-only edits to the shared owner-delete functions ──────────────
-- Same convention as 20260821030000_daily_nudge_emails_ledger.sql and
-- 20260822120000_admin_safe_actions_and_support_queue.sql: every existing
-- statement is unchanged, new statements are added, no signature change.

create or replace function public.delete_own_person(p_person_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  collapsing record;
  deleted_group_ids uuid[] := array[]::uuid[];
  deleted_group_names text[] := array[]::text[];
  n_group_threads int := 0;
  n_person_threads int := 0;
  group_result jsonb;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_person_id is null then
    raise exception 'Person id required';
  end if;

  if not exists (
    select 1 from people where id = p_person_id and owner_id = uid
  ) then
    raise exception 'Person not found';
  end if;

  if exists (
    select 1 from people where id = p_person_id and owner_id = uid and is_self is true
  ) then
    raise exception 'Cannot delete your self profile this way';
  end if;

  -- Groups that would fall below the create minimum (3) after removing this
  -- person: delete via delete_own_group (threads first, then group).
  for collapsing in
    select g.id as group_id, g.name as group_name, count(gm.person_id)::int as member_count
    from groups g
    join group_members gm on gm.group_id = g.id
    where g.owner_id = uid
      and g.id in (
        select group_id from group_members where person_id = p_person_id
      )
    group by g.id, g.name
    having count(gm.person_id) <= 3
  loop
    group_result := public.delete_own_group(collapsing.group_id);
    n_group_threads := n_group_threads + coalesce((group_result->>'deleted_threads')::int, 0);
    deleted_group_ids := array_append(deleted_group_ids, collapsing.group_id);
    deleted_group_names := array_append(deleted_group_names, collapsing.group_name);
  end loop;

  -- Remaining memberships on groups that still have 3+ after removal.
  delete from group_members where person_id = p_person_id;

  -- Notes scoped to this person or a pair including them (about_person NO ACTION).
  delete from notes
    where owner_id = uid
      and (
        about_person = p_person_id
        or pair_low = p_person_id
        or pair_high = p_person_id
      );

  delete from relationships
    where owner_id = uid
      and (person_a = p_person_id or person_b = p_person_id);

  delete from synastry
    where owner_id = uid
      and (person_low = p_person_id or person_high = p_person_id);

  -- transits.person_id is NO ACTION on people.
  delete from transits where person_id = p_person_id;

  delete from person_daily_nudges where person_id = p_person_id;

  -- New: memorial_milestones.profile_id is NO ACTION on people (see table
  -- comment above) — clear before the people row, same as transits/notes.
  delete from memorial_milestones where profile_id = p_person_id;

  -- Person / pair threads (group threads for collapsing groups already gone).
  delete from threads
    where owner_id = uid
      and (
        subject_person = p_person_id
        or pair_low = p_person_id
        or pair_high = p_person_id
      );
  get diagnostics n_person_threads = row_count;

  -- charts CASCADE; invites.person_id CASCADE.
  delete from people where id = p_person_id and owner_id = uid;

  return jsonb_build_object(
    'ok', true,
    'person_id', p_person_id,
    'deleted_group_ids', to_jsonb(deleted_group_ids),
    'deleted_group_names', to_jsonb(deleted_group_names),
    'deleted_group_threads', n_group_threads,
    'deleted_person_threads', n_person_threads
  );
end;
$$;

comment on function public.delete_own_person(uuid) is
  'Atomic owner-scoped person delete. Collapsing groups (<3 members after removal) are deleted by calling delete_own_group (thread-first); remaining memberships, notes, relationships, synastry, transits, person_daily_nudges, memorial_milestones, and person/pair threads cleared before people row. SECURITY DEFINER; enforces owner_id = auth.uid(); refuses is_self.';

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

  -- New: memorial_milestones is NO ACTION on people (see table comment
  -- above) — clear before people row, same as person_daily_nudges/transits.
  delete from memorial_milestones
    where profile_id in (select id from people where owner_id = uid)
       or user_id = uid;

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
  'Deletes the caller''s owned graph (including person_daily_nudges, daily_nudge_emails, memorial_milestones, and support_requests) then the profile row. SECURITY DEFINER; auth.uid() only.';
