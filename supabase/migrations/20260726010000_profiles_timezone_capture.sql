-- Nudge delivery Phase A (prerequisite for the server-side nudge job, Phase B):
-- capture and store a per-user CURRENT-RESIDENCE IANA timezone on profiles.
--
-- This is deliberately distinct from people.tz_offset_min, which is a
-- birth-place UTC offset in minutes, resolved once at chart-entry time for
-- natal chart math, and is per-person (not per-account). profiles.timezone
-- is the account owner's "where they live now" zone, the only new input
-- ownerLocalDate() (packages/astro/src/transit-nudge/dates.ts) will need in
-- Phase B to compute the owner's local calendar day from a server cron
-- instead of the runtime's local tz. ownerLocalDate() itself is unchanged
-- in this phase — this migration only adds storage + validation for the
-- value it will later consume.

alter table public.profiles
  add column if not exists timezone text;

comment on column public.profiles.timezone is
  'IANA timezone of the account owner''s current residence (e.g. "America/New_York"), captured client-side from Intl.DateTimeFormat().resolvedOptions().timeZone. Nullable — existing accounts start null and are backfilled on next app load. NOT the birth-place tz on people.tz_offset_min. Phase A only stores this; Phase B (server nudge job) is the first reader.';

-- Extend the owner-controlled column grant introduced in
-- 20260724180000_comped_entitlement_and_profile_column_grants.sql. Same
-- pattern: authenticated may write only these columns on `profiles`; row
-- policies (profiles owner read|upsert|update, id = auth.uid()) already
-- scope every write to the caller's own row and are untouched here.
revoke insert on table public.profiles from anon, authenticated;
revoke update on table public.profiles from anon, authenticated;

grant insert (id, display_name, house_system, timezone) on table public.profiles to authenticated;
grant update (id, display_name, house_system, timezone) on table public.profiles to authenticated;

-- Server-side backstop: the client only ever writes the browser's own
-- Intl-resolved zone (validated client-side too — see TimezoneSync), but a
-- malformed value here would silently break Phase B's date math, so reject
-- anything that isn't a real IANA zone name Postgres itself knows about.
-- pg_timezone_names is a system view (not a table an agent could tamper
-- with), so this is a cheap, real check — not just a shape check.
create or replace function public.validate_profile_timezone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.timezone is not null
     and not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'invalid timezone: %', new.timezone;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_validate_timezone on public.profiles;
create trigger profiles_validate_timezone
  before insert or update on public.profiles
  for each row execute function public.validate_profile_timezone();
