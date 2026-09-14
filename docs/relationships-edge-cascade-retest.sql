-- Integration retest for relationships edge constraints (Phase 1).
-- Project: eigfvribtntbxyjutsma
-- Run as postgres (Dashboard → SQL) or via execute_sql.
-- Creates a temporary auth user + two people + one edge, deletes one person,
-- asserts the edge is gone via ON DELETE CASCADE, then cleans up.
-- Does not touch the existing 21 remembrance rows.

DO $$
DECLARE
  owner_t uuid := 'dddddddd-eeee-4fff-8aaa-bbbbbbbbbbbb';
  p_keep uuid := 'eeeeeeee-0001-4000-8000-000000000001';
  p_drop uuid := 'eeeeeeee-0002-4000-8000-000000000002';
  edge_id uuid;
  remnant int;
  remembrance_n int;
  self_err text;
  type_err text;
  dup_err text;
BEGIN
  SELECT count(*) INTO remembrance_n
  FROM public.relationships
  WHERE relation_type = 'remembrance';
  IF remembrance_n <> 21 THEN
    RAISE EXCEPTION 'expected 21 remembrance rows before probe, got %', remembrance_n;
  END IF;

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change_token_new, email_change
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000', owner_t, 'authenticated', 'authenticated',
    'relationships-edge-cascade-retest@example.com', crypt('test', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  );

  INSERT INTO public.people (id, owner_id, display_name, relation, birth_precision, is_self)
  VALUES
    (p_keep, owner_t, 'Edge Keep', 'friend', 'none', false),
    (p_drop, owner_t, 'Edge Drop', 'friend', 'none', false);

  INSERT INTO public.relationships (owner_id, person_a, person_b, relation_type)
  VALUES (owner_t, p_keep, p_drop, 'friend')
  RETURNING id INTO edge_id;

  BEGIN
    INSERT INTO public.relationships (owner_id, person_a, person_b, relation_type)
    VALUES (owner_t, p_keep, p_keep, 'friend');
    self_err := 'UNEXPECTED_SUCCESS';
  EXCEPTION WHEN OTHERS THEN
    self_err := SQLERRM;
  END;
  IF self_err = 'UNEXPECTED_SUCCESS' THEN
    RAISE EXCEPTION 'self-loop insert should fail';
  END IF;

  BEGIN
    INSERT INTO public.relationships (owner_id, person_a, person_b, relation_type)
    VALUES (owner_t, p_keep, p_drop, 'probe');
    type_err := 'UNEXPECTED_SUCCESS';
  EXCEPTION WHEN OTHERS THEN
    type_err := SQLERRM;
  END;
  IF type_err = 'UNEXPECTED_SUCCESS' THEN
    RAISE EXCEPTION 'invalid relation_type insert should fail';
  END IF;

  BEGIN
    INSERT INTO public.relationships (owner_id, person_a, person_b, relation_type)
    VALUES (owner_t, p_keep, p_drop, 'friend');
    dup_err := 'UNEXPECTED_SUCCESS';
  EXCEPTION WHEN OTHERS THEN
    dup_err := SQLERRM;
  END;
  IF dup_err = 'UNEXPECTED_SUCCESS' THEN
    RAISE EXCEPTION 'duplicate undirected edge insert should fail';
  END IF;

  DELETE FROM public.people WHERE id = p_drop AND owner_id = owner_t;

  SELECT count(*) INTO remnant
  FROM public.relationships
  WHERE id = edge_id;
  IF remnant <> 0 THEN
    RAISE EXCEPTION 'edge % still present after deleting person', edge_id;
  END IF;

  SELECT count(*) INTO remnant
  FROM public.people
  WHERE id = p_keep;
  IF remnant <> 1 THEN
    RAISE EXCEPTION 'kept person was deleted';
  END IF;

  SELECT count(*) INTO remembrance_n
  FROM public.relationships
  WHERE relation_type = 'remembrance';
  IF remembrance_n <> 21 THEN
    RAISE EXCEPTION 'remembrance count changed during probe, got %', remembrance_n;
  END IF;

  DELETE FROM public.people WHERE owner_id = owner_t;
  DELETE FROM public.profiles WHERE id = owner_t;
  DELETE FROM auth.users WHERE id = owner_t;

  RAISE NOTICE 'relationships edge cascade retest ok; self_err=%; type_err=%; dup_err=%',
    self_err, type_err, dup_err;
EXCEPTION WHEN OTHERS THEN
  DELETE FROM public.people WHERE owner_id = owner_t;
  DELETE FROM public.profiles WHERE id = owner_t;
  DELETE FROM auth.users WHERE id = owner_t;
  RAISE;
END;
$$;
