-- Durable per-person daily transit nudge record.
-- Home (and future delivery) read copy_resolved frozen at write — never
-- recompute sentences on open. PRIMARY KEY (person_id, date); date is the
-- owner-local calendar day. owner-scoped RLS.

create table if not exists person_daily_nudges (
  owner_id uuid not null references auth.users(id),
  person_id uuid not null references people(id),
  date date not null,
  transit_body text,
  natal_body text,
  aspect_type text,
  aspect_class text,
  -- Precise orb only in exact birth-time mode; NULL for date_sign / empty
  -- (never fabricate a degree-exact orb on unknown-time charts).
  orb_deg numeric,
  phase text,
  exact_at timestamptz,
  pass_id text,
  copy_key text not null,
  copy_tier text not null
    check (copy_tier in ('full', 'drop_domain', 'framing_gentle', 'empty_hedge')),
  copy_resolved text not null,
  relationship_framing text not null,
  precision_mode text not null
    check (precision_mode in ('exact', 'date_sign', 'year_blocked', 'none')),
  minor_safe boolean not null default false,
  selection_reason jsonb,
  created_at timestamptz not null default now(),
  primary key (person_id, date)
);

create index if not exists person_daily_nudges_owner_date_idx
  on person_daily_nudges (owner_id, date);

create index if not exists person_daily_nudges_person_pass_idx
  on person_daily_nudges (person_id, pass_id)
  where pass_id is not null;

alter table person_daily_nudges enable row level security;

create policy "person_daily_nudges owner all"
on person_daily_nudges for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

-- Optional home lead pin — pinned person takes the sky lead slot when they
-- have any eligible (non-empty) nudge that day.
alter table profiles
  add column if not exists pinned_sky_person_id uuid references people(id) on delete set null;

-- Clear durable nudges before people delete (person_id is NO ACTION).
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

  delete from group_members where person_id = p_person_id;

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

  delete from transits where person_id = p_person_id;
  delete from person_daily_nudges where person_id = p_person_id;

  delete from threads
    where owner_id = uid
      and (
        subject_person = p_person_id
        or pair_low = p_person_id
        or pair_high = p_person_id
      );
  get diagnostics n_person_threads = row_count;

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
  'Atomic owner-scoped person delete. Clears memberships, notes, relationships, synastry, transits, person_daily_nudges, and person/pair threads before people row. Collapsing groups deleted via delete_own_group. SECURITY DEFINER; enforces owner_id = auth.uid(); refuses is_self.';

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

  delete from profiles where id = uid;
end;
$$;

comment on function public.purge_own_account_data() is
  'Deletes the caller''s owned graph (including person_daily_nudges) then the profile row. SECURITY DEFINER; auth.uid() only.';
