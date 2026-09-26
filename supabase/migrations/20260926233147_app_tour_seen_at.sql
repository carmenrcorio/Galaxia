-- Cross-platform, one-time home tour state.
--
-- The existing onboarding_completed_at records whether the five-step
-- orientation was settled. This independent timestamp records whether the
-- reader has completed or skipped the later app-home tour on either client.
alter table public.profiles
  add column if not exists app_tour_seen_at timestamptz;

comment on column public.profiles.app_tour_seen_at is
  'When the signed-in app-home tour was completed or skipped on web or mobile. NULL remains eligible only after onboarding_completed_at is set.';

-- Profiles already has owner-only SELECT/UPDATE/INSERT RLS policies. Preserve
-- the complete authenticated column allowlist while exposing the new field.
revoke insert on table public.profiles from anon, authenticated;
revoke update on table public.profiles from anon, authenticated;

grant insert (
  id, display_name, house_system, timezone, daily_nudge_emails_enabled,
  relational_transit_alerts, onboarding_step, onboarding_completed_at,
  weekly_constellation_letter_enabled, app_tour_seen_at
) on table public.profiles to authenticated;

grant update (
  id, display_name, house_system, timezone, daily_nudge_emails_enabled,
  relational_transit_alerts, onboarding_step, onboarding_completed_at,
  weekly_constellation_letter_enabled, app_tour_seen_at
) on table public.profiles to authenticated;
