-- Isolation + advisor-close retest for
-- 20260914140000_pin_search_path_and_revoke_trigger_execute.sql
--
-- Run against a DISPOSABLE Supabase project or preview branch, NEVER
-- eigfvribtntbxyjutsma (ENGINEERING.md §5 / §16). Creates two throwaway
-- auth users, seeds owner-A rows in every table this change touches,
-- probes user B as `authenticated`, then rolls the whole transaction back.
--
-- Expect: the DO block raises 'ISOLATION_OK'. Any other exception is a fail.

BEGIN;

DO $$
DECLARE
  owner_a uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  owner_b uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  person_a uuid;
  person_b uuid;
  milestone_id uuid;
  chart_before jsonb := '{"probe":"before"}'::jsonb;
  chart_after jsonb := '{"probe":"after"}'::jsonb;
  mirror_data jsonb;
  updated_after timestamptz;
  people_as_b bigint;
  admin_users_as_b bigint;
  admin_audit_as_b bigint;
  nudge_as_b bigint;
  trial_as_b bigint;
  share_as_b bigint;
  relations_as_b bigint;
  sync_chart_exec boolean;
  sync_person_exec boolean;
  memorial_exec boolean;
  sync_chart_auth boolean;
  sync_person_auth boolean;
  memorial_auth boolean;
  create_invite_exec boolean;
  instance uuid;
BEGIN
  SELECT coalesce(
    (SELECT instance_id FROM auth.users LIMIT 1),
    '00000000-0000-0000-0000-000000000000'
  ) INTO instance;

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change_token_new, email_change
  )
  VALUES
    (instance, owner_a, 'authenticated', 'authenticated',
     'rls-probe-a@galaxia.invalid', crypt('probe-only-not-for-login', gen_salt('bf')),
     now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
     now(), now(), '', '', '', ''),
    (instance, owner_b, 'authenticated', 'authenticated',
     'rls-probe-b@galaxia.invalid', crypt('probe-only-not-for-login', gen_salt('bf')),
     now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
     now(), now(), '', '', '', '')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, display_name)
  VALUES (owner_a, 'Probe A'), (owner_b, 'Probe B')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.people (owner_id, display_name, is_self, birth_precision)
  VALUES (owner_a, 'A self', true, 'none')
  RETURNING id INTO person_a;

  INSERT INTO public.people (owner_id, display_name, is_self, birth_precision, chart_source)
  VALUES (owner_b, 'mirror of A', false, 'none', 'linked')
  RETURNING id INTO person_b;

  INSERT INTO public.charts (person_id, data, engine_version, house_system)
  VALUES
    (person_a, chart_before, 1, 'placidus'),
    (person_b, chart_before, 1, 'placidus');

  INSERT INTO public.connection_grants (
    subject_user, viewer_user, viewer_person_id, share_level, status
  )
  VALUES (owner_a, owner_b, person_b, 'chart', 'active');

  INSERT INTO public.admin_users (owner_id, role)
  VALUES (owner_a, 'admin')
  ON CONFLICT (owner_id) DO NOTHING;

  INSERT INTO public.admin_audit_log (actor_id, action, target_user_id)
  VALUES (owner_a, 'grant_comp', owner_b);

  INSERT INTO public.daily_nudge_emails (owner_id, date, person_id)
  VALUES (owner_a, current_date, person_a);

  INSERT INTO public.trial_emails (user_id, kind)
  VALUES (owner_a, 'day1');

  INSERT INTO public.quick_share_snapshots (share_token, kind, payload, created_by)
  VALUES ('probe-token-not-a-secret', 'single', '{"probe":true}'::jsonb, owner_a);

  INSERT INTO public.memorial_milestones (profile_id, user_id, date, title)
  VALUES (person_a, owner_a, current_date, 'probe milestone')
  RETURNING id INTO milestone_id;

  -- The trigger must overwrite a stale updated_at supplied in the same UPDATE.
  UPDATE public.memorial_milestones
     SET title = 'probe milestone updated',
         updated_at = now() - interval '1 hour'
   WHERE id = milestone_id
  RETURNING updated_at INTO updated_after;
  IF updated_after < now() - interval '1 minute' THEN
    RAISE EXCEPTION 'MEMORIAL_TRIGGER_DEAD updated_at=% (still stale)', updated_after;
  END IF;

  UPDATE public.charts SET data = chart_after WHERE person_id = person_a;
  SELECT data INTO mirror_data FROM public.charts WHERE person_id = person_b;
  IF mirror_data IS DISTINCT FROM chart_after THEN
    RAISE EXCEPTION 'CHART_MIRROR_TRIGGER_DEAD got=%', mirror_data;
  END IF;

  SELECT has_function_privilege('anon', 'public.sync_linked_chart_mirrors()', 'EXECUTE')
    INTO sync_chart_exec;
  SELECT has_function_privilege('anon', 'public.sync_linked_person_mirrors()', 'EXECUTE')
    INTO sync_person_exec;
  SELECT has_function_privilege('anon', 'public.set_memorial_milestones_updated_at()', 'EXECUTE')
    INTO memorial_exec;
  SELECT has_function_privilege('authenticated', 'public.sync_linked_chart_mirrors()', 'EXECUTE')
    INTO sync_chart_auth;
  SELECT has_function_privilege('authenticated', 'public.sync_linked_person_mirrors()', 'EXECUTE')
    INTO sync_person_auth;
  SELECT has_function_privilege('authenticated', 'public.set_memorial_milestones_updated_at()', 'EXECUTE')
    INTO memorial_auth;
  SELECT has_function_privilege('authenticated', 'public.create_connect_invite(text, uuid, boolean)', 'EXECUTE')
    INTO create_invite_exec;

  IF sync_chart_exec OR sync_person_exec OR memorial_exec
     OR sync_chart_auth OR sync_person_auth OR memorial_auth THEN
    RAISE EXCEPTION 'TRIGGER_EXECUTE_STILL_GRANTED anon(chart=%, person=%, memorial=%) auth(chart=%, person=%, memorial=%)',
      sync_chart_exec, sync_person_exec, memorial_exec,
      sync_chart_auth, sync_person_auth, memorial_auth;
  END IF;
  IF create_invite_exec IS NOT TRUE THEN
    RAISE EXCEPTION 'PRODUCT_RPC_EXECUTE_LOST create_connect_invite';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', owner_b::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', owner_b::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';

  SELECT count(*) INTO people_as_b FROM public.people;
  SELECT count(*) INTO nudge_as_b FROM public.daily_nudge_emails;
  SELECT count(*) INTO trial_as_b FROM public.trial_emails;
  SELECT count(*) INTO share_as_b FROM public.quick_share_snapshots;
  SELECT count(*) INTO relations_as_b FROM public.galaxy_relations;

  -- admin_users / admin_audit_log also revoke SELECT, so a session may
  -- error with insufficient_privilege instead of returning 0. Both are deny.
  BEGIN
    SELECT count(*) INTO admin_users_as_b FROM public.admin_users;
  EXCEPTION WHEN insufficient_privilege THEN
    admin_users_as_b := 0;
  END;
  BEGIN
    SELECT count(*) INTO admin_audit_as_b FROM public.admin_audit_log;
  EXCEPTION WHEN insufficient_privilege THEN
    admin_audit_as_b := 0;
  END;

  IF people_as_b <> 1 THEN
    RAISE EXCEPTION 'PEOPLE_ISOLATION_FAILED visible=% (expect 1, B own row only)', people_as_b;
  END IF;
  IF admin_users_as_b <> 0 OR admin_audit_as_b <> 0 OR nudge_as_b <> 0
     OR trial_as_b <> 0 OR share_as_b <> 0 OR relations_as_b <> 0 THEN
    RAISE EXCEPTION 'DENY_ALL_FAILED admin_users=% audit=% nudge=% trial=% share=% relations=%',
      admin_users_as_b, admin_audit_as_b, nudge_as_b, trial_as_b, share_as_b, relations_as_b;
  END IF;

  RAISE EXCEPTION 'ISOLATION_OK people_visible_to_B=1 deny_all=0 memorial_trigger=live chart_mirror=live rpc_create_connect=kept';
END $$;

ROLLBACK;
