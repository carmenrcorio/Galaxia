-- Make "at most one self per account" structurally impossible to violate,
-- rather than merely guarded in one UI path (web /welcome had a client-side,
-- point-in-time check; apps/mobile/app/onboarding.tsx had none at all).
--
-- A partial unique index on (owner_id) WHERE is_self enforces this at the
-- database level regardless of which code path — web, mobile, a retried
-- request, two tabs — attempts the insert. Fails to apply if any duplicate
-- self already exists for an owner; Phase 0/1 confirmed none currently do.
create unique index if not exists people_one_self_per_owner
  on people (owner_id)
  where is_self = true;
