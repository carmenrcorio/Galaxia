-- Constellation Connect: the transactional core.
--
-- Nine SECURITY DEFINER functions implementing section 3 of
-- design/galaxia-constellation-connect-plan.md (PR #213), against the schema
-- from 20260913160000 (PR #217) plus the completion in 20260913170000. Same
-- pattern as delete_own_person and purge_own_account_data: language plpgsql
-- security definer, search_path pinned to public, explicit revoke/grant.
-- No routes, no UI: both clients call these directly with supabase.rpc().
--
-- Locked product decisions this file encodes and does not re-argue:
-- accepting requires an account and never exposes raw birth data, only a
-- computed chart, unless the recipient explicitly opts into 'details'.
-- Mutual add is a separate call, never a parameter of accept_connect_invite.
-- The sender's share-back defaults off (invites.sender_shares_back), so a
-- reverse grant lands pending unless the sender pre-authorized it. There is
-- no entitlement check anywhere in this file: auth is required, a paid plan
-- is not. There is no expiry sweep: connect_invite_preview writes the lazy
-- expiry, same as the plan specifies.

-- ─── Surface 1: generate and revoke a link ────────────────────────────────

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
  'Sender generates a constellation connect link. Validates p_relation against galaxy_relations and refuses child/grandchild outright (minor implying). If p_person_id is given, requires it is owned by the caller, unlinked, birth_precision none, and not is_minor, then revokes any existing pending connect invite for that person before inserting a fresh one (regenerate). Token is 32 hex characters, expiry is fixed at 14 days. SECURITY DEFINER; auth.uid() only.';

create or replace function public.revoke_connect_invite(p_token text)
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

  update invites
     set status = 'revoked'
   where token = p_token
     and from_user = uid
     and kind = 'constellation_connect'
     and status = 'pending';

  if not found then
    raise exception 'Invite not found';
  end if;
end;
$$;

revoke all on function public.revoke_connect_invite(text) from public, anon;
grant execute on function public.revoke_connect_invite(text) to authenticated;

comment on function public.revoke_connect_invite(text) is
  'Sender cancels a link without replacing it. Only affects a pending constellation_connect invite owned by the caller. SECURITY DEFINER; auth.uid() only.';

-- ─── Surface 2: preview ────────────────────────────────────────────────────

create or replace function public.connect_invite_preview(p_token text)
returns table (
  inviter_name text,
  relation text,
  expires_at timestamptz,
  state text,
  sender_shares_back boolean,
  already_connected boolean,
  recipient_has_self_chart boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_invite record;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Lazy expiry, written back here so the expired status is real rather
  -- than decoration, with no sweep job required.
  update invites
     set status = 'expired'
   where invites.token = p_token
     and invites.kind = 'constellation_connect'
     and invites.status = 'pending'
     and invites.expires_at <= now();

  select i.from_user, i.relationship_type, i.expires_at, i.status, i.sender_shares_back
    into v_invite
    from invites i
   where i.token = p_token
     and i.kind = 'constellation_connect';

  recipient_has_self_chart := exists (
    select 1 from people p
      join charts c on c.person_id = p.id
     where p.owner_id = uid and p.is_self is true
  );

  if not found then
    inviter_name := null;
    relation := null;
    expires_at := null;
    sender_shares_back := null;
    already_connected := false;
    state := 'not_found';
    return next;
    return;
  end if;

  relation := v_invite.relationship_type;
  expires_at := v_invite.expires_at;
  sender_shares_back := v_invite.sender_shares_back;

  select p.display_name into inviter_name
    from people p where p.owner_id = v_invite.from_user and p.is_self is true;

  already_connected := exists (
    select 1 from connection_grants
     where subject_user = uid and viewer_user = v_invite.from_user and status <> 'revoked'
  );

  if v_invite.from_user = uid then
    state := 'self_invite';
  elsif v_invite.status = 'revoked' then
    state := 'revoked';
  elsif v_invite.status = 'expired' then
    state := 'expired';
  elsif v_invite.status = 'accepted' then
    state := 'already_accepted';
  elsif already_connected then
    state := 'already_connected';
  else
    state := 'ok';
  end if;

  return next;
end;
$$;

revoke all on function public.connect_invite_preview(text) from public, anon;
grant execute on function public.connect_invite_preview(text) to authenticated;

comment on function public.connect_invite_preview(text) is
  'Recipient facing, side effect limited to the lazy expiry write back. Returns the sender display name and chosen relation only, never anything about the sender galaxy. state is ok, not_found, expired, already_accepted, revoked, self_invite, or already_connected. SECURITY DEFINER because the recipient has no RLS visibility into invites; auth.uid() only.';

-- ─── Surface 3: accept ─────────────────────────────────────────────────────

create or replace function public.accept_connect_invite(p_token text, p_share_level text)
returns table (grant_id uuid, sender_user uuid, sender_name text, sender_shares_back boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_invite record;
  v_recipient_self record;
  v_recipient_chart record;
  v_target_person uuid;
  v_grant_id uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_share_level not in ('chart', 'details') then
    raise exception 'Invalid share level';
  end if;

  -- Require the recipient's own chart before anything else. The client
  -- should already have gated on recipient_has_self_chart; this function
  -- does not trust the client.
  select * into v_recipient_self from people where owner_id = uid and is_self is true;
  if not found then
    raise exception 'Add your own birth details before accepting a connection';
  end if;

  select * into v_recipient_chart from charts where person_id = v_recipient_self.id;
  if not found then
    raise exception 'Add your own birth details before accepting a connection';
  end if;

  -- Single accepted use per link, enforced by this one statement: two
  -- simultaneous accepts leave exactly one winner, the other gets zero rows.
  update invites
     set status = 'accepted', accepted_by = uid, accepted_at = now()
   where token = p_token
     and kind = 'constellation_connect'
     and status = 'pending'
     and expires_at > now()
     and from_user <> uid
  returning invites.id, invites.from_user, invites.person_id, invites.relationship_type, invites.sender_shares_back
    into v_invite;

  if not found then
    raise exception 'This invitation is no longer available';
  end if;

  -- Merge into the sender's proposed target if it still qualifies (it may
  -- have been edited, linked, or deleted since the link was made), otherwise
  -- create a new star in the sender's galaxy.
  if v_invite.person_id is not null and exists (
    select 1 from people
     where id = v_invite.person_id
       and owner_id = v_invite.from_user
       and linked_user_id is null
       and birth_precision = 'none'
  ) then
    v_target_person := v_invite.person_id;

    update people set
        linked_user_id = uid,
        chart_source = 'linked',
        birth_precision = v_recipient_self.birth_precision,
        birth_date = case when p_share_level = 'details' then v_recipient_self.birth_date else null end,
        birth_time = case when p_share_level = 'details' then v_recipient_self.birth_time else null end,
        birth_place = case when p_share_level = 'details' then v_recipient_self.birth_place else null end,
        birth_lat = case when p_share_level = 'details' then v_recipient_self.birth_lat else null end,
        birth_lng = case when p_share_level = 'details' then v_recipient_self.birth_lng else null end,
        tz_offset_min = case when p_share_level = 'details' then v_recipient_self.tz_offset_min else null end
      where id = v_target_person;
  else
    insert into people (
      owner_id, display_name, relation, is_minor, birth_precision,
      birth_date, birth_time, birth_place, birth_lat, birth_lng, tz_offset_min,
      linked_user_id, chart_source, is_self
    )
    values (
      v_invite.from_user,
      v_recipient_self.display_name,
      v_invite.relationship_type,
      false,
      v_recipient_self.birth_precision,
      case when p_share_level = 'details' then v_recipient_self.birth_date else null end,
      case when p_share_level = 'details' then v_recipient_self.birth_time else null end,
      case when p_share_level = 'details' then v_recipient_self.birth_place else null end,
      case when p_share_level = 'details' then v_recipient_self.birth_lat else null end,
      case when p_share_level = 'details' then v_recipient_self.birth_lng else null end,
      case when p_share_level = 'details' then v_recipient_self.tz_offset_min else null end,
      uid,
      'linked',
      false
    )
    returning id into v_target_person;
  end if;

  -- Copy the chart. The mirror carries the recipient's own house_system:
  -- their preference governs their own chart.
  insert into charts (person_id, house_system, data, engine_version, computed_at)
  values (
    v_target_person, v_recipient_chart.house_system, v_recipient_chart.data,
    v_recipient_chart.engine_version, v_recipient_chart.computed_at
  )
  on conflict (person_id) do update set
    house_system = excluded.house_system,
    data = excluded.data,
    engine_version = excluded.engine_version,
    computed_at = excluded.computed_at;

  -- Upsert on the pair, not a plain insert: a prior grant between this exact
  -- subject and viewer may exist in status revoked (sender regenerated after
  -- a revoke), and connection_grants_pair_idx is not partial, so a plain
  -- insert would collide with that historical row instead of reviving it.
  insert into connection_grants (subject_user, viewer_user, viewer_person_id, share_level, status, source_invite, revoked_at)
  values (uid, v_invite.from_user, v_target_person, p_share_level, 'active', v_invite.id, null)
  on conflict (subject_user, viewer_user) do update set
    viewer_person_id = excluded.viewer_person_id,
    share_level = excluded.share_level,
    status = 'active',
    source_invite = excluded.source_invite,
    revoked_at = null,
    updated_at = now()
  returning id into v_grant_id;

  select p.display_name into sender_name
    from people p where p.owner_id = v_invite.from_user and p.is_self is true;

  grant_id := v_grant_id;
  sender_user := v_invite.from_user;
  sender_shares_back := v_invite.sender_shares_back;
  return next;
end;
$$;

revoke all on function public.accept_connect_invite(text, text) from public, anon;
grant execute on function public.accept_connect_invite(text, text) to authenticated;

comment on function public.accept_connect_invite(text, text) is
  'Recipient accepts a link. Requires the recipient to already have their own is_self person and chart. Consumes the invite with one UPDATE ... RETURNING guarded by status = pending and expires_at > now(), which is the entire single-use-under-concurrency story. Merges into the invite person_id if it still qualifies, else creates a new star owned by the sender, copies the chart under the recipient own house_system, and upserts the connection_grants row for this pair active. share_level chart leaves birth columns null on the mirror; details copies them. Does not touch mutual add; that is add_sender_to_constellation, a separate call. SECURITY DEFINER, this is inherently cross user (the recipient writes into the sender rows), which no RLS policy should ever permit.';

-- ─── Surface 4: mutual add ─────────────────────────────────────────────────

create or replace function public.add_sender_to_constellation(p_token text, p_relation text)
returns table (person_id uuid, reverse_grant_state text)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_relation text := lower(trim(p_relation));
  v_invite record;
  v_sender_self record;
  v_sender_chart record;
  v_new_person uuid;
  v_state text;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if v_relation is null or v_relation = '' or not exists (select 1 from galaxy_relations where value = v_relation) then
    raise exception 'Unknown relation: %', v_relation;
  end if;

  -- Reachable only after this exact recipient accepted this exact token.
  select id, from_user, sender_shares_back into v_invite
    from invites
   where token = p_token
     and kind = 'constellation_connect'
     and status = 'accepted'
     and accepted_by = uid;

  if not found then
    raise exception 'This invitation has not been accepted by you';
  end if;

  -- Declining at the mutual add prompt, then coming back, must not be
  -- blocked by a stale row: only a live (non revoked) reverse grant counts
  -- as already added.
  if exists (
    select 1 from connection_grants
     where subject_user = v_invite.from_user and viewer_user = uid and status <> 'revoked'
  ) then
    raise exception 'Already added to your constellation';
  end if;

  select * into v_sender_self from people where owner_id = v_invite.from_user and is_self is true;
  if not found then
    raise exception 'Sender profile not found';
  end if;

  if v_invite.sender_shares_back then
    select * into v_sender_chart from charts where charts.person_id = v_sender_self.id;
  end if;

  -- Always a new person row, never a merge: mutual add has no merge target
  -- concept, and this repo has no dedupe logic of any kind.
  insert into people (
    owner_id, display_name, relation, is_minor, birth_precision,
    birth_date, birth_time, birth_place, birth_lat, birth_lng, tz_offset_min,
    linked_user_id, chart_source, is_self
  )
  values (
    uid,
    v_sender_self.display_name,
    v_relation,
    false,
    case when v_invite.sender_shares_back then v_sender_self.birth_precision else 'none' end,
    null, null, null, null, null, null,
    v_invite.from_user,
    case when v_invite.sender_shares_back then 'linked' else 'local' end,
    false
  )
  returning id into v_new_person;

  if v_invite.sender_shares_back then
    -- Not ON CONFLICT (person_id): person_id is this function's own OUT
    -- parameter name, and a conflict target column list is checked against
    -- PL/pgSQL variables just like a WHERE clause is, so that syntax raises
    -- "column reference person_id is ambiguous" here even though the insert
    -- target's column list itself does not. v_new_person is always a brand
    -- new row (see the insert immediately above), so this is insert-only in
    -- practice; the exists check is defensive, not load bearing.
    if exists (select 1 from charts where charts.person_id = v_new_person) then
      update charts set
          house_system = v_sender_chart.house_system,
          data = v_sender_chart.data,
          engine_version = v_sender_chart.engine_version,
          computed_at = v_sender_chart.computed_at
        where charts.person_id = v_new_person;
    else
      insert into charts (person_id, house_system, data, engine_version, computed_at)
      values (v_new_person, v_sender_chart.house_system, v_sender_chart.data, v_sender_chart.engine_version, v_sender_chart.computed_at);
    end if;
    v_state := 'active';
  else
    v_state := 'pending';
  end if;

  insert into connection_grants (subject_user, viewer_user, viewer_person_id, share_level, status, source_invite, revoked_at)
  values (v_invite.from_user, uid, v_new_person, 'chart', v_state, v_invite.id, null)
  on conflict (subject_user, viewer_user) do update set
    viewer_person_id = excluded.viewer_person_id,
    share_level = 'chart',
    status = v_state,
    source_invite = excluded.source_invite,
    revoked_at = null,
    updated_at = now();

  person_id := v_new_person;
  reverse_grant_state := v_state;
  return next;
end;
$$;

revoke all on function public.add_sender_to_constellation(text, text) from public, anon;
grant execute on function public.add_sender_to_constellation(text, text) to authenticated;

comment on function public.add_sender_to_constellation(text, text) is
  'Recipient opts into adding the sender back, on its own screen, after accept_connect_invite already committed. Reachable only for a token this exact caller accepted. If the original invite carried sender_shares_back true, mirrors the sender chart immediately and the reverse grant is active; otherwise creates a bare star for the sender (linked_user_id still set, no chart) and the reverse grant is pending, awaiting approve_reverse_grant. SECURITY DEFINER; cross user for the same reason accept_connect_invite is.';

-- ─── Surface 5: grant management ───────────────────────────────────────────

create or replace function public.set_connection_share_level(p_grant_id uuid, p_share_level text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_grant record;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_share_level not in ('chart', 'details') then
    raise exception 'Invalid share level';
  end if;

  select * into v_grant from connection_grants
   where id = p_grant_id and subject_user = uid and status = 'active';
  if not found then
    raise exception 'Grant not found';
  end if;

  update connection_grants
     set share_level = p_share_level, updated_at = now()
   where id = p_grant_id;

  -- Backfill now, in this statement. The mirrored chart / people triggers
  -- from 20260913160000 only fire on the subject's next unrelated edit to
  -- charts or people; a level change has to take effect immediately.
  if p_share_level = 'details' then
    update people v set
        birth_date = s.birth_date,
        birth_time = s.birth_time,
        birth_place = s.birth_place,
        birth_lat = s.birth_lat,
        birth_lng = s.birth_lng,
        tz_offset_min = s.tz_offset_min
      from people s
     where s.owner_id = uid and s.is_self is true
       and v.id = v_grant.viewer_person_id;
  else
    update people
       set birth_date = null, birth_time = null, birth_place = null,
           birth_lat = null, birth_lng = null, tz_offset_min = null
     where id = v_grant.viewer_person_id;
  end if;
end;
$$;

revoke all on function public.set_connection_share_level(uuid, text) from public, anon;
grant execute on function public.set_connection_share_level(uuid, text) to authenticated;

comment on function public.set_connection_share_level(uuid, text) is
  'Subject only change of an active grant level, with an immediate backfill or clear of the mirrored birth columns in the same call rather than waiting on the next unrelated edit to trigger the sync. SECURITY DEFINER; enforces subject_user = auth.uid().';

create or replace function public.revoke_connection(p_grant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_grant record;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_grant from connection_grants
   where id = p_grant_id and subject_user = uid and status in ('active', 'pending');
  if not found then
    raise exception 'Grant not found';
  end if;

  delete from charts where person_id = v_grant.viewer_person_id;

  update people set
      chart_source = 'local',
      birth_precision = 'none',
      birth_date = null, birth_time = null, birth_place = null,
      birth_lat = null, birth_lng = null, tz_offset_min = null,
      linked_user_id = null
    where id = v_grant.viewer_person_id;

  update connection_grants
     set status = 'revoked', revoked_at = now(), updated_at = now()
   where id = p_grant_id;
end;
$$;

revoke all on function public.revoke_connection(uuid) from public, anon;
grant execute on function public.revoke_connection(uuid) to authenticated;

comment on function public.revoke_connection(uuid) is
  'Subject only revoke of an active or pending grant. Strips the mirror exactly as purge_own_account_data does, deletes the mirrored chart, nulls the birth columns, chart_source back to local, linked_user_id to null, leaving the viewer a bare star with their own label and relation intact. The grant row itself stays, marked revoked, so its person row can be picked up again later by a fresh accept or reverse add. SECURITY DEFINER; enforces subject_user = auth.uid().';

create or replace function public.approve_reverse_grant(p_grant_id uuid, p_share_level text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_grant record;
  v_subject_self record;
  v_subject_chart record;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_share_level not in ('chart', 'details') then
    raise exception 'Invalid share level';
  end if;

  select * into v_grant from connection_grants
   where id = p_grant_id and subject_user = uid and status = 'pending';
  if not found then
    raise exception 'Grant not found';
  end if;

  select * into v_subject_self from people where owner_id = uid and is_self is true;
  if not found then
    raise exception 'Self profile not found';
  end if;

  select * into v_subject_chart from charts where person_id = v_subject_self.id;
  if not found then
    raise exception 'Add your own birth details before approving this connection';
  end if;

  update people set
      chart_source = 'linked',
      linked_user_id = uid,
      birth_precision = v_subject_self.birth_precision,
      birth_date = case when p_share_level = 'details' then v_subject_self.birth_date else null end,
      birth_time = case when p_share_level = 'details' then v_subject_self.birth_time else null end,
      birth_place = case when p_share_level = 'details' then v_subject_self.birth_place else null end,
      birth_lat = case when p_share_level = 'details' then v_subject_self.birth_lat else null end,
      birth_lng = case when p_share_level = 'details' then v_subject_self.birth_lng else null end,
      tz_offset_min = case when p_share_level = 'details' then v_subject_self.tz_offset_min else null end
    where id = v_grant.viewer_person_id;

  insert into charts (person_id, house_system, data, engine_version, computed_at)
  values (v_grant.viewer_person_id, v_subject_chart.house_system, v_subject_chart.data, v_subject_chart.engine_version, v_subject_chart.computed_at)
  on conflict (person_id) do update set
    house_system = excluded.house_system,
    data = excluded.data,
    engine_version = excluded.engine_version,
    computed_at = excluded.computed_at;

  update connection_grants
     set status = 'active', share_level = p_share_level, updated_at = now()
   where id = p_grant_id;
end;
$$;

revoke all on function public.approve_reverse_grant(uuid, text) from public, anon;
grant execute on function public.approve_reverse_grant(uuid, text) to authenticated;

comment on function public.approve_reverse_grant(uuid, text) is
  'The original sender approves the pending reverse direction of a mutual add. Subject only (subject_user = auth.uid()), grant must be pending. Fills in the mirror now: chart always, birth columns only at share_level details. A chart never moves without that specific person having said yes. SECURITY DEFINER; enforces subject_user = auth.uid().';

create or replace function public.acknowledge_connect_accept(p_invite_id uuid)
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

  update invites
     set sender_ack_at = now()
   where id = p_invite_id
     and from_user = uid
     and kind = 'constellation_connect'
     and status = 'accepted';

  if not found then
    raise exception 'Invite not found';
  end if;
end;
$$;

revoke all on function public.acknowledge_connect_accept(uuid) from public, anon;
grant execute on function public.acknowledge_connect_accept(uuid) to authenticated;

comment on function public.acknowledge_connect_accept(uuid) is
  'Sender dismisses the acceptance notification card, mirroring the relational_transits.push_sent_at idiom rather than a notifications table. SECURITY DEFINER; enforces from_user = auth.uid().';
