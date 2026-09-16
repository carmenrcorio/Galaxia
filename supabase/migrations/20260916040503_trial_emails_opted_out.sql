-- Trial-email CAN-SPAM unsubscribe: a dedicated opt-out column so the
-- no-login /api/unsubscribe route can stop trial emails without flipping
-- daily_nudge_emails_enabled or weekly_constellation_letter_enabled.
--
-- Reuses profiles.unsubscribe_token (already unique, service-role only).
-- This column is service-role only by omission from the authenticated
-- insert/update grant lists (same posture as unsubscribe_token). Existing
-- users default to false and keep receiving trial emails until they opt out.

alter table public.profiles
  add column if not exists trial_emails_opted_out boolean not null default false;

comment on column public.profiles.trial_emails_opted_out is
  'CAN-SPAM opt-out for trial lifecycle emails. Default false. Set true by the no-login /api/unsubscribe route via profiles.unsubscribe_token. The trial-emails cron checks this before sending. Independent of daily_nudge_emails_enabled and weekly_constellation_letter_enabled. Not owner-writable from Settings.';
