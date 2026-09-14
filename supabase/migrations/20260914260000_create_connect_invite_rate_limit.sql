-- Rate limit create_connect_invite: at most 10 pending, non-expired
-- constellation_connect invites created by auth.uid() in the last 24 hours.
-- ENGINEERING.md §2: new file. Does not edit 20260913180000.
-- Timestamp is 20260914260000 so this runs after
-- 20260914240000_comparison_history.sql and
-- 20260914250000_weekly_constellation_letter.sql (same-day collision on the
-- original 240000 prefix).
-- Safe to apply via `supabase db push`. Does not need autocommit.

create or replace function public.create_connect_invite(
  p_relation text,
  p_person_id uuid default null,
  p_share_back boolean default false
)
returns table (token text, expires_at timestamptz, person_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_relation text := lower(trim(p_relation));
  v_token text;
  v_expires timestamptz;
  v_open int;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if v_relation is null or v_relation = '' then
    raise exception 'Relation is required';
  end if;

  if not exists (select 1 from galaxy_relations where value = v_relation) then
    raise exception 'Unknown relation: %', v_relation;
  end if;

  -- Constellation connect never appears to invite a minor. child and
  -- grandchild are the two GALAXY_RELATION_PICKER_OPTIONS values
  -- packages/core/src/galaxy-orbit.ts resolveGalaxyRelation places in band
  -- "children" (a direct descendant generation); niece and nephew sit in
  -- band "circle" alongside friend and cousin and are not excluded. Those
  -- two relations keep going through the existing birth_data flow.
  if v_relation in ('child', 'grandchild') then
    raise exception 'Constellation connect is not offered for this relation';
  end if;

  if p_person_id is not null then
    if not exists (
      select 1 from people
       where id = p_person_id
         and owner_id = uid
         and linked_user_id is null
         and birth_precision = 'none'
         and coalesce(is_minor, false) is false
    ) then
      raise exception 'This person is not a valid merge target';
    end if;

    -- Regenerate: revoke any existing pending connect invite for this exact
    -- person before the new row lands, so the old URL stops working
    -- immediately. The partial unique index makes two live links for one
    -- person impossible regardless of ordering, this just avoids relying on
    -- the constraint violation as the only signal.
    update invites
       set status = 'revoked'
     where invites.from_user = uid
       and invites.person_id = p_person_id
       and invites.kind = 'constellation_connect'
       and invites.status = 'pending';
  end if;

  -- Count after regenerate so replacing one live link for the same person
  -- does not trip the cap. Pending rows whose expires_at has passed are
  -- excluded even if lazy expiry has not written status = expired yet.
  select count(*) into v_open
    from invites
   where from_user = uid
     and kind = 'constellation_connect'
     and status = 'pending'
     and expires_at > now()
     and created_at > now() - interval '24 hours';

  if v_open >= 10 then
    raise exception 'Too many open invitations';
  end if;

  v_token := replace(gen_random_uuid()::text, '-', '');
  v_expires := now() + interval '14 days';

  insert into invites (token, from_user, person_id, relationship_type, kind, status, expires_at, sender_shares_back)
  values (v_token, uid, p_person_id, v_relation, 'constellation_connect', 'pending', v_expires, coalesce(p_share_back, false));

  token := v_token;
  expires_at := v_expires;
  person_id := p_person_id;
  return next;
end;
$$;

revoke all on function public.create_connect_invite(text, uuid, boolean) from public, anon;
grant execute on function public.create_connect_invite(text, uuid, boolean) to authenticated;

comment on function public.create_connect_invite(text, uuid, boolean) is
  'Sender generates a constellation connect link. Validates p_relation against galaxy_relations and refuses child/grandchild outright (minor implying). If p_person_id is given, requires it is owned by the caller, unlinked, birth_precision none, and not is_minor, then revokes any existing pending connect invite for that person before inserting a fresh one (regenerate). Caps pending non-expired constellation_connect invites created by auth.uid() in the last 24 hours at 10. Token is 32 hex characters, expiry is fixed at 14 days. SECURITY DEFINER; auth.uid() only.';
