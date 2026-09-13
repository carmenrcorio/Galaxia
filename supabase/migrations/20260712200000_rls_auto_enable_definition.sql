-- Commit the definition of public.rls_auto_enable(), which has existed in
-- production since before this history was kept but was never written down.
--
-- WHY THIS FILE IS BACK-DATED. The very next migration,
-- 20260712210000_rls_cross_user_hardening.sql, ends with:
--
--   revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
--
-- That statement has always worked against production, because the function
-- is really there. It cannot work against a database built only from this
-- repo, because nothing here creates it. So any from-scratch replay of the
-- committed history dies at that line with:
--
--   ERROR: function public.rls_auto_enable() does not exist (SQLSTATE 42883)
--
-- which is exactly what the "Supabase Preview" check reports on every pull
-- request that touches supabase/migrations. A file dated after the revoke
-- cannot fix it, since the failure happens before that file would run.
-- Hence the timestamp, which places this immediately before the migration
-- that needs it and immediately after 20260712190000.
--
-- APPLYING THIS TO PRODUCTION IS A NO-OP. The body below was read out of
-- production pg_proc (project eigfvribtntbxyjutsma) on 2026-09-13 and is
-- reproduced verbatim, whitespace and capitalization included, so the
-- CREATE OR REPLACE resolves to the definition already installed. The
-- event trigger is recreated to the same shape it already has. Nothing
-- about the running database changes; this only stops the repo from lying
-- about what the database contains.
--
-- Between merging this and applying it, Migration Ledger Parity will report
-- the file as committed-but-unapplied. That is the workflow behaving as
-- ENGINEERING.md section 16 intends, not a fault.

create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

comment on function public.rls_auto_enable() is
  'Backstop that enables row level security on every new table in the public schema, so a table can never be shipped readable by default because someone forgot the alter. Fires from the ensure_rls event trigger below. Defensive only: every table in this repo still enables RLS explicitly in its own migration, and this catches the one that does not. Swallows its own errors on purpose, because a backstop that can abort an unrelated CREATE TABLE is worse than the omission it guards against. Created out of band before this migration history began; committed here so the history can be replayed from nothing.';

-- Recreated rather than guarded with "if not exists", which event triggers
-- do not support. The drop is safe on a database that does not have it.
drop event trigger if exists ensure_rls;
create event trigger ensure_rls on ddl_command_end
  when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  execute function public.rls_auto_enable();

-- Matches the posture 20260712210000 applies to handle_new_user(): the
-- event trigger fires as its owner, so no API role ever needs to call this
-- directly. Stated here as well so a from-scratch database reaches the next
-- migration's identical revoke already in the intended state.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
