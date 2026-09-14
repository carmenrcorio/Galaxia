-- Cross-user isolation re-test for public.comparison_history.
-- Project: eigfvribtntbxyjutsma
-- Run in Supabase SQL editor as postgres (Dashboard -> SQL).
-- Creates a temporary auth user B, probes a SELECT, then rolls back.
-- Does not change the "comparison_history owner all" policy.

BEGIN;

DO $$
DECLARE
  owner_a uuid;
  owner_b uuid := 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
  rows_as_a bigint;
  rows_as_b bigint;
BEGIN
  SELECT owner_id INTO owner_a FROM comparison_history LIMIT 1;
  IF owner_a IS NULL THEN
    RAISE EXCEPTION 'No comparison_history rows: seed owner A data first';
  END IF;

  SELECT count(*) INTO rows_as_a FROM comparison_history WHERE owner_id = owner_a;

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change_token_new, email_change
  )
  VALUES (
    coalesce((SELECT instance_id FROM auth.users WHERE id = owner_a), '00000000-0000-0000-0000-000000000000'),
    owner_b,
    'authenticated',
    'authenticated',
    'comparison-history-rls-probe-b@galaxia.invalid',
    crypt('probe-only-not-for-login', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(), now(), '', '', '', ''
  )
  ON CONFLICT (id) DO NOTHING;

  PERFORM set_config('request.jwt.claim.sub', owner_b::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', owner_b::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';

  SELECT count(*) INTO rows_as_b FROM public.comparison_history;

  RAISE NOTICE 'comparison_history_owned_by_A=% (expect > 0)', rows_as_a;
  RAISE NOTICE 'comparison_history_visible_to_B=% (expect 0)', rows_as_b;

  IF rows_as_b <> 0 THEN
    RAISE EXCEPTION 'ISOLATION_FAILED comparison_history_visible_to_B=%', rows_as_b;
  END IF;

  RAISE EXCEPTION 'ISOLATION_OK comparison_history_visible_to_B=0: rolling back probe user';
END $$;

ROLLBACK;
