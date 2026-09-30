-- Phase 1 security audit fixes (2026-09-30):
-- 1) Hardcode rate-limit caps in RPCs (no caller-supplied p_limit / p_window_seconds).
-- 2) Waitlist inserts are service-role only via POST /api/early-access (drop anon policy).
-- 3) Account purge is service-role only via purge_user_account(uuid) after app-layer re-auth.

-- ─── Rate limits (C-03) ─────────────────────────────────────────────────────
-- Export: @galaxia/core ACCOUNT_EXPORT_RATE_LIMIT = 1 per 3600s.
-- Vela: supabase/functions/vela-chat/index.ts — trial 5/600s, paid (incl. comped) 20/600s.

drop function if exists public.check_and_increment_vela_rate(int, int);
drop function if exists public.check_and_increment_account_export_rate(int, int);

create or replace function public.check_and_increment_account_export_rate()
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  allowed boolean;
  p_limit int := 1;
  p_window_seconds int := 3600;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.account_export_rate_limits (user_id, window_start, count)
  values (uid, now(), 0)
  on conflict (user_id) do nothing;

  update public.account_export_rate_limits
  set window_start = case
                       when now() - window_start >= make_interval(secs => p_window_seconds)
                       then now()
                       else window_start
                     end,
      count = case
                when now() - window_start >= make_interval(secs => p_window_seconds)
                then 1
                else count + 1
              end
  where user_id = uid
    and (
      now() - window_start >= make_interval(secs => p_window_seconds)
      or count < p_limit
    )
  returning true into allowed;

  return coalesce(allowed, false);
end;
$$;

comment on function public.check_and_increment_account_export_rate() is
  'Atomic per-user fixed-window admission check for GET /api/account/export. Hardcoded 1 export per 3600s for auth.uid() only.';

revoke all on function public.check_and_increment_account_export_rate() from public, anon;
grant execute on function public.check_and_increment_account_export_rate() to authenticated;

create or replace function public.check_and_increment_vela_rate()
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  allowed boolean;
  p_limit int;
  p_window_seconds int := 600;
  v_comped boolean;
  v_subscription_status text;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select comped, subscription_status
    into v_comped, v_subscription_status
    from public.profiles
   where id = uid;

  -- Match vela-chat/index.ts: trialing and not comped → tighter cap; else paid cap.
  if coalesce(v_comped, false) is false and v_subscription_status = 'trialing' then
    p_limit := 5;
  else
    p_limit := 20;
  end if;

  insert into public.vela_rate_limits (user_id, window_start, count)
  values (uid, now(), 0)
  on conflict (user_id) do nothing;

  update public.vela_rate_limits
  set window_start = case
                        when now() - window_start >= make_interval(secs => p_window_seconds)
                        then now()
                        else window_start
                      end,
      count = case
                 when now() - window_start >= make_interval(secs => p_window_seconds)
                 then 1
                 else count + 1
               end
  where user_id = uid
    and (
      now() - window_start >= make_interval(secs => p_window_seconds)
      or count < p_limit
    )
  returning true into allowed;

  return coalesce(allowed, false);
end;
$$;

comment on function public.check_and_increment_vela_rate() is
  'Atomic per-user fixed-window admission check for vela-chat. Hardcoded trial 5/600s, paid 20/600s (tier from profiles), for auth.uid() only.';

revoke all on function public.check_and_increment_vela_rate() from public, anon;
grant execute on function public.check_and_increment_vela_rate() to authenticated;

-- ─── early_access (anon INSERT closed) ──────────────────────────────────────
-- Inserts go only through POST /api/early-access (service role, email validation,
-- upsert on unique email). The former anon INSERT policy was an abuse vector.

drop policy if exists "anon can insert waitlist" on public.early_access;

comment on table public.early_access is
  'Marketing waitlist emails. Client inserts are forbidden (RLS default-deny); POST /api/early-access validates email and upserts via service role.';

-- ─── Account purge (C-02): service-role RPC only ─────────────────────────────

create or replace function public.purge_user_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid;
  caller_email text;
  jwt_role text;
begin
  jwt_role := coalesce(current_setting('request.jwt.claim.role', true), '');
  if jwt_role <> 'service_role' and session_user not in ('postgres', 'supabase_admin') then
    raise exception 'Not authorized';
  end if;

  if p_user_id is null then
    raise exception 'User id required';
  end if;

  uid := p_user_id;

  select email into caller_email from auth.users where id = uid;

  delete from charts
    where person_id in (select id from people where linked_user_id = uid);

  update people set
      chart_source = 'local',
      birth_precision = 'none',
      birth_date = null,
      birth_time = null,
      birth_place = null,
      birth_lat = null,
      birth_lng = null,
      tz_offset_min = null,
      linked_user_id = null
    where linked_user_id = uid;

  delete from connection_grants where subject_user = uid or viewer_user = uid;

  delete from notes where owner_id = uid;

  update notes
    set about_person = null
    where about_person in (select id from people where owner_id = uid);

  delete from synastry where owner_id = uid;
  delete from comparison_history where owner_id = uid;
  delete from relationships where owner_id = uid;

  delete from person_daily_nudges
    where person_id in (select id from people where owner_id = uid)
       or owner_id = uid;

  delete from daily_nudge_emails where owner_id = uid;

  delete from constellation_letters where owner_id = uid;

  delete from email_sends where owner_id = uid;

  update email_templates set updated_by = null where updated_by = uid;
  update email_campaigns set created_by = null where created_by = uid;

  delete from memorial_milestones
    where profile_id in (select id from people where owner_id = uid)
       or user_id = uid;

  delete from relational_transits where owner_id = uid;

  delete from push_tokens where owner_id = uid;

  delete from transits
    where person_id in (select id from people where owner_id = uid);

  delete from group_members
    where person_id in (select id from people where owner_id = uid);

  delete from group_members
    where group_id in (select id from groups where owner_id = uid);

  delete from messages
    where thread_id in (select id from threads where owner_id = uid);

  delete from thread_participants where user_id = uid;

  delete from threads where owner_id = uid;

  update threads
    set subject_person = null
    where subject_person in (select id from people where owner_id = uid);

  update threads
    set group_id = null
    where group_id in (select id from groups where owner_id = uid);

  delete from groups where owner_id = uid;

  update profiles set pinned_sky_person_id = null where id = uid;

  delete from charts
    where person_id in (select id from people where owner_id = uid);

  delete from people where owner_id = uid;

  delete from trial_emails where user_id = uid;
  delete from invites where from_user = uid;

  update invites set accepted_by = null where accepted_by = uid;

  delete from support_requests where owner_id = uid;
  update support_requests set handled_by = null where handled_by = uid;

  delete from quick_share_snapshots where created_by = uid;

  delete from vela_rate_limits where user_id = uid;

  delete from account_export_rate_limits where user_id = uid;

  delete from admin_users where owner_id = uid;

  if caller_email is not null and length(trim(caller_email)) > 0 then
    delete from early_access where lower(email) = lower(caller_email);
  end if;

  delete from profiles where id = uid;

  update public.admin_audit_log set actor_id = null where actor_id = uid;
  update public.admin_audit_log set target_user_id = null where target_user_id = uid;

  delete from auth.users where id = uid;
end;
$$;

comment on function public.purge_user_account(uuid) is
  'Service-role-only account purge for a given user id. Called from POST /api/account/delete after password re-verification.';

revoke all on function public.purge_user_account(uuid) from public, anon, authenticated;
grant execute on function public.purge_user_account(uuid) to service_role;

create or replace function public.purge_own_account_data()
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  raise exception 'Direct purge_own_account_data RPC is disabled. Use POST /api/account/delete after password confirmation.';
end;
$$;

comment on function public.purge_own_account_data() is
  'Disabled for authenticated callers. Self-serve deletion uses purge_user_account via the web API after password re-verification.';

revoke all on function public.purge_own_account_data() from public, anon, authenticated;
