-- Integration retest for delete_own_group / delete_own_person
-- Project: eigfvribtntbxyjutsma
-- Run as postgres (Dashboard → SQL) or via execute_sql.
-- Creates a temporary auth user + owned graph, asserts outcomes, then cleans up.
-- Does not touch real user data.

DO $$
DECLARE
  owner_a uuid := 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff';
  owner_b uuid := 'cccccccc-dddd-4eee-8fff-000000000000';
  p1 uuid := gen_random_uuid();
  p2 uuid := gen_random_uuid();
  p3 uuid := gen_random_uuid();
  p4 uuid := gen_random_uuid();
  g_with_threads uuid := gen_random_uuid();
  g_empty uuid := gen_random_uuid();
  g_collapse uuid := gen_random_uuid();
  g_keep uuid := gen_random_uuid();
  t1 uuid := gen_random_uuid();
  t2 uuid := gen_random_uuid();
  m1 uuid := gen_random_uuid();
  result jsonb;
  thread_left int;
  msg_left int;
  group_left int;
  person_left int;
  members_left int;
  err text;
BEGIN
  -- Seed auth users (minimal columns for FK).
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change_token_new, email_change
  )
  VALUES
    (
      '00000000-0000-0000-0000-000000000000', owner_a, 'authenticated', 'authenticated',
      'delete-own-retest-a@example.com', crypt('test', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      now(), now(), '', '', '', ''
    ),
    (
      '00000000-0000-0000-0000-000000000000', owner_b, 'authenticated', 'authenticated',
      'delete-own-retest-b@example.com', crypt('test', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      now(), now(), '', '', '', ''
    );

  INSERT INTO people (id, owner_id, display_name, relation, birth_precision, is_self)
  VALUES
    (p1, owner_a, 'Retest One', 'friend', 'none', false),
    (p2, owner_a, 'Retest Two', 'friend', 'none', false),
    (p3, owner_a, 'Retest Three', 'friend', 'none', false),
    (p4, owner_a, 'Retest Four', 'friend', 'none', false);

  INSERT INTO groups (id, owner_id, name, kind) VALUES
    (g_with_threads, owner_a, 'Threaded Cohort', 'friends'),
    (g_empty, owner_a, 'Quiet Cohort', 'friends'),
    (g_collapse, owner_a, 'Will Collapse', 'friends'),
    (g_keep, owner_a, 'Will Keep', 'friends');

  INSERT INTO group_members (group_id, person_id) VALUES
    (g_with_threads, p1), (g_with_threads, p2), (g_with_threads, p3),
    (g_empty, p1), (g_empty, p2), (g_empty, p3),
    (g_collapse, p1), (g_collapse, p2), (g_collapse, p3),
    (g_keep, p1), (g_keep, p2), (g_keep, p3), (g_keep, p4);

  INSERT INTO threads (id, owner_id, mode, group_id) VALUES
    (t1, owner_a, 'ask', g_with_threads),
    (t2, owner_a, 'ask', g_with_threads);

  INSERT INTO messages (id, thread_id, sender, body) VALUES
    (m1, t1, 'user', 'hello group'),
    (gen_random_uuid(), t1, 'vela', 'reply'),
    (gen_random_uuid(), t2, 'user', 'second thread');

  -- Act as owner_a
  PERFORM set_config('request.jwt.claim.sub', owner_a::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', owner_a::text, 'role', 'authenticated')::text, true);

  -- 1) Delete group with attached threads → threads + messages gone
  result := public.delete_own_group(g_with_threads);
  IF coalesce((result->>'deleted_threads')::int, -1) <> 2 THEN
    RAISE EXCEPTION 'expected deleted_threads=2, got %', result;
  END IF;
  SELECT count(*) INTO thread_left FROM threads WHERE id IN (t1, t2);
  SELECT count(*) INTO msg_left FROM messages WHERE thread_id IN (t1, t2);
  SELECT count(*) INTO group_left FROM groups WHERE id = g_with_threads;
  IF thread_left <> 0 OR msg_left <> 0 OR group_left <> 0 THEN
    RAISE EXCEPTION 'group-with-threads cleanup failed threads=% messages=% groups=%', thread_left, msg_left, group_left;
  END IF;
  RAISE NOTICE 'PASS delete_own_group with threads';

  -- 2) Delete group with no threads
  result := public.delete_own_group(g_empty);
  IF coalesce((result->>'deleted_threads')::int, -1) <> 0 THEN
    RAISE EXCEPTION 'expected deleted_threads=0 for empty group, got %', result;
  END IF;
  SELECT count(*) INTO group_left FROM groups WHERE id = g_empty;
  IF group_left <> 0 THEN
    RAISE EXCEPTION 'empty group still present';
  END IF;
  RAISE NOTICE 'PASS delete_own_group with no threads';

  -- 3) Non-owner cannot delete owner_a group
  PERFORM set_config('request.jwt.claim.sub', owner_b::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', owner_b::text, 'role', 'authenticated')::text, true);
  BEGIN
    PERFORM public.delete_own_group(g_collapse);
    RAISE EXCEPTION 'non-owner delete_own_group should have failed';
  EXCEPTION
    WHEN others THEN
      IF SQLERRM LIKE 'Group not found%' THEN
        RAISE NOTICE 'PASS non-owner delete_own_group denied';
      ELSE
        RAISE;
      END IF;
  END;

  -- 4) Person delete collapses 3-member group, keeps 4-member group (minus membership)
  PERFORM set_config('request.jwt.claim.sub', owner_a::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', owner_a::text, 'role', 'authenticated')::text, true);
  result := public.delete_own_person(p1);
  IF NOT (result->'deleted_group_names' ? 0) THEN
    RAISE EXCEPTION 'expected at least one collapsed group, got %', result;
  END IF;
  SELECT count(*) INTO group_left FROM groups WHERE id = g_collapse;
  SELECT count(*) INTO members_left FROM group_members WHERE group_id = g_keep;
  SELECT count(*) INTO person_left FROM people WHERE id = p1;
  IF group_left <> 0 THEN
    RAISE EXCEPTION 'collapsing group still present';
  END IF;
  IF members_left <> 3 THEN
    RAISE EXCEPTION 'kept group should have 3 members, got %', members_left;
  END IF;
  IF person_left <> 0 THEN
    RAISE EXCEPTION 'person row still present';
  END IF;
  RAISE NOTICE 'PASS delete_own_person collapses below-minimum groups';

  -- 5) Non-owner cannot delete person
  PERFORM set_config('request.jwt.claim.sub', owner_b::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', owner_b::text, 'role', 'authenticated')::text, true);
  BEGIN
    PERFORM public.delete_own_person(p2);
    RAISE EXCEPTION 'non-owner delete_own_person should have failed';
  EXCEPTION
    WHEN others THEN
      IF SQLERRM LIKE 'Person not found%' THEN
        RAISE NOTICE 'PASS non-owner delete_own_person denied';
      ELSE
        RAISE;
      END IF;
  END;

  -- Cleanup remaining seed (owner_a leftovers + both auth users)
  PERFORM set_config('request.jwt.claim.sub', owner_a::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', owner_a::text, 'role', 'authenticated')::text, true);
  DELETE FROM group_members WHERE group_id IN (g_keep);
  DELETE FROM groups WHERE owner_id = owner_a;
  DELETE FROM people WHERE owner_id = owner_a;
  DELETE FROM auth.users WHERE id IN (owner_a, owner_b);

  RAISE NOTICE 'ALL delete_own_* retests passed';
END $$;
