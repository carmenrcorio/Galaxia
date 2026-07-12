-- Second-user isolation re-test for Galaxia RLS hardening
-- Project: eigfvribtntbxyjutsma
-- Run in Supabase SQL editor as postgres (Dashboard → SQL).
-- This script creates a temporary auth user B, probes denials, then deletes B.
-- It does NOT call vela-chat (needs a real JWT); see notes at the bottom for that.

BEGIN;

DO $$
DECLARE
  owner_a uuid;
  owner_b uuid := 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
  victim_thread uuid;
  victim_person uuid;
  victim_group uuid;
  tp_err text;
  invite_err text;
  rel_err text;
  gm_err text;
  people_as_b bigint;
BEGIN
  SELECT owner_id INTO owner_a FROM people LIMIT 1;
  IF owner_a IS NULL THEN
    RAISE EXCEPTION 'No people rows — seed owner A data first';
  END IF;

  SELECT id INTO victim_thread FROM threads WHERE owner_id = owner_a LIMIT 1;
  SELECT id INTO victim_person FROM people WHERE owner_id = owner_a LIMIT 1;
  SELECT id INTO victim_group FROM groups WHERE owner_id = owner_a LIMIT 1;

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
    'rls-probe-b@galaxia.invalid',
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

  SELECT count(*) INTO people_as_b FROM people;

  BEGIN
    INSERT INTO thread_participants (thread_id, user_id, consented_at)
    VALUES (victim_thread, owner_b, now());
    tp_err := 'UNEXPECTED_SUCCESS';
  EXCEPTION WHEN OTHERS THEN
    tp_err := SQLERRM;
  END;

  BEGIN
    INSERT INTO invites (token, from_user, person_id, kind, status)
    VALUES ('probe-foreign-person', owner_b, victim_person, 'birth_data', 'pending');
    invite_err := 'UNEXPECTED_SUCCESS';
  EXCEPTION WHEN OTHERS THEN
    invite_err := SQLERRM;
  END;

  BEGIN
    INSERT INTO relationships (owner_id, person_a, person_b, relation_type)
    VALUES (owner_b, victim_person, victim_person, 'probe');
    rel_err := 'UNEXPECTED_SUCCESS';
  EXCEPTION WHEN OTHERS THEN
    rel_err := SQLERRM;
  END;

  IF victim_group IS NOT NULL THEN
    BEGIN
      INSERT INTO group_members (group_id, person_id)
      VALUES (victim_group, victim_person);
      gm_err := 'UNEXPECTED_SUCCESS';
    EXCEPTION WHEN OTHERS THEN
      gm_err := SQLERRM;
    END;
  ELSE
    gm_err := 'SKIPPED_NO_GROUP';
  END IF;

  RAISE NOTICE 'people_visible_to_B=% (expect 0)', people_as_b;
  RAISE NOTICE 'thread_participants_self_join=% (expect RLS deny)', tp_err;
  RAISE NOTICE 'invite_foreign_person=% (expect RLS deny)', invite_err;
  RAISE NOTICE 'relationship_foreign_people=% (expect RLS deny)', rel_err;
  RAISE NOTICE 'group_members_foreign=% (expect RLS deny or SKIPPED)', gm_err;

  IF people_as_b <> 0
     OR tp_err = 'UNEXPECTED_SUCCESS'
     OR invite_err = 'UNEXPECTED_SUCCESS'
     OR rel_err = 'UNEXPECTED_SUCCESS'
     OR gm_err = 'UNEXPECTED_SUCCESS' THEN
    RAISE EXCEPTION 'ISOLATION_FAILED people=% tp=% invite=% rel=% gm=%',
      people_as_b, tp_err, invite_err, rel_err, gm_err;
  END IF;

  RAISE EXCEPTION 'ISOLATION_OK — rolling back probe user and any side effects';
END $$;

ROLLBACK;

-- vela-chat HTTP re-test (run outside SQL, as user B with a real JWT):
--   curl -sS -X POST "$SUPABASE_URL/functions/v1/vela-chat" \
--     -H "Authorization: Bearer $USER_B_JWT" \
--     -H "apikey: $ANON_KEY" \
--     -H "Content-Type: application/json" \
--     -d '{"mode":"ask","subjectPersonId":"<OWNER_A_PERSON_UUID>","userMessage":"hi"}'
-- Expect: HTTP 404 {"error":"People not found for this thread."}
-- Do NOT expect chart/birth data for A's person.
