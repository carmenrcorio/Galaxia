-- Nudge delivery Phase B2 (part 1 of 2): consent + no-login unsubscribe schema.
--
-- Locked founder decision: consent is OPT-OUT, default ON, with easy
-- unsubscribe. This column landing means every EXISTING account is opted in
-- the moment this migration runs (see changelog.d fragment for the flagged
-- legal/first-send implications) — that retroactive opt-in is intentional,
-- not a bug.
--
-- `daily_nudge_emails_enabled` is owner-controlled, same pattern as
-- `timezone`/`house_system` (20260726010000_profiles_timezone_capture.sql,
-- 20260724180000_comped_entitlement_and_profile_column_grants.sql): profiles
-- RLS is row-level only (id = auth.uid()), so this only needs extending the
-- existing column-write grant — no new row policy.
alter table public.profiles
  add column if not exists daily_nudge_emails_enabled boolean not null default true;

comment on column public.profiles.daily_nudge_emails_enabled is
  'Opt-out consent for the "your sky today" nudge email (Phase B2). Default true (opt-out, default-on — locked founder decision). Owner-writable from Settings, same grant pattern as timezone/house_system. The nudge-send cron checks this per owner before sending; it never affects in-app person_daily_nudges rows (those are computed regardless — this only gates the EMAIL).';

-- `unsubscribe_token` is the no-login unsubscribe mechanism: a random,
-- unguessable, per-user opaque token embedded in every nudge email's
-- unsubscribe link (List-Unsubscribe header + visible footer link). Same
-- shape as quick_share_snapshots.share_token
-- (20260722140000_quick_share_snapshots.sql) — gen_random_uuid(), unique,
-- looked up by the unsubscribe route using the service-role client. UNLIKE
-- the consent column, this is deliberately NEVER granted to anon/authenticated
-- (no client ever needs to read or write its own token — the email send job
-- reads it server-side with the service role to build the link).
alter table public.profiles
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid();

comment on column public.profiles.unsubscribe_token is
  'Opaque per-user token for the no-login "/api/nudge-email/unsubscribe?token=" route (Phase B2). 128-bit random, unique — identifies exactly one user by construction, so a token for user A structurally cannot affect user B. Service-role only: never granted to anon/authenticated (not read by any client query; only the server-side email send job and the unsubscribe route touch it).';

create unique index if not exists profiles_unsubscribe_token_idx
  on public.profiles (unsubscribe_token);

-- Extend the owner-controlled column grant. daily_nudge_emails_enabled joins
-- the client-writable set; unsubscribe_token is deliberately NOT added to
-- either grant list (service-role/postgres only, via the table's existing
-- default privileges — see file header).
revoke insert on table public.profiles from anon, authenticated;
revoke update on table public.profiles from anon, authenticated;

grant insert (id, display_name, house_system, timezone, daily_nudge_emails_enabled)
  on table public.profiles to authenticated;
grant update (id, display_name, house_system, timezone, daily_nudge_emails_enabled)
  on table public.profiles to authenticated;
