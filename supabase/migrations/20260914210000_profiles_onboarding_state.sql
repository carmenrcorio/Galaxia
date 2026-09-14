-- First-run orientation state on public.profiles.
--
-- WHY THIS REVERSES A RECORDED DECISION
-- apps/web/app/start/page.tsx deliberately derived "onboarded" from the record
-- (a self people row AND at least one non-self people row) instead of storing a
-- flag, on the grounds that a boolean can drift while the record cannot. That
-- reasoning still holds for the question it answered, which was only ever
-- "should this login land on onboarding or on the constellation?".
--
-- It cannot answer the question the five-step orientation flow asks, which is
-- "where exactly did this person stop?". Of the five steps, only two leave a
-- trace in `people`: the step that creates the other person, and the step that
-- creates the self row. Choosing a relationship, reading the first statement,
-- and picking a next step are invisible to the record, so a user who closes the
-- tab on the reading cannot be resumed from `people` alone. The flow also runs
-- other-person-first, which makes the old two-fact signal ambiguous in a way it
-- never was when self always came first.
--
-- The drift risk the original note called out is answered by keeping the step
-- column advisory: /start still reads `people` for the "do they have a
-- constellation" question, and this column only says where to resume. A stale
-- or impossible step value degrades to starting the flow at the beginning, never
-- to asserting something about the record that is not true.
--
-- See changelog.d/cursor-first-run-orientation-3193.md.
alter table public.profiles
  add column if not exists onboarding_step text
    check (onboarding_step in ('person', 'birth', 'reading', 'you', 'next', 'done', 'skipped'));

alter table public.profiles
  add column if not exists onboarding_completed_at timestamptz;

comment on column public.profiles.onboarding_step is
  'First-run orientation resume point. NULL means never started. One of person, birth, reading, you, next while in progress. Terminal values are done (finished the flow) and skipped (left it early on purpose). Advisory only: an unrecognised or stale value degrades to starting the flow over, and it never overrides what the people table says about the actual constellation.';

comment on column public.profiles.onboarding_completed_at is
  'When first-run orientation stopped being offered, set for both done and skipped. Non-null is the single "never show this flow again unasked" signal. Skipped users still get a visible way to restart the flow from the constellation; that entry point re-enters the flow explicitly rather than by redirect.';

-- Column-level grants are replaced wholesale, matching the pattern in
-- 20260909030000_relational_transits.sql. Both new columns are owner-writable:
-- the flow itself records progress from the browser as the user moves through
-- it. Billing and entitlement columns stay service-role only, as before.
revoke insert on table public.profiles from anon, authenticated;
revoke update on table public.profiles from anon, authenticated;

grant insert (
  id, display_name, house_system, timezone, daily_nudge_emails_enabled,
  relational_transit_alerts, onboarding_step, onboarding_completed_at
) on table public.profiles to authenticated;

grant update (
  id, display_name, house_system, timezone, daily_nudge_emails_enabled,
  relational_transit_alerts, onboarding_step, onboarding_completed_at
) on table public.profiles to authenticated;
