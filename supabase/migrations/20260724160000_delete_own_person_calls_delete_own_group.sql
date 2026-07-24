-- Consolidate: delete_own_person must call delete_own_group for collapsing
-- cohorts, not reimplement thread-first deletion. threads.group_id is NO ACTION;
-- two copies of that ordering will drift.

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
  'Atomic owner-scoped person delete. Collapsing groups (<3 members after removal) are deleted by calling delete_own_group (thread-first); remaining memberships, notes, relationships, synastry, transits, and person/pair threads cleared before people row. SECURITY DEFINER; enforces owner_id = auth.uid(); refuses is_self.';
