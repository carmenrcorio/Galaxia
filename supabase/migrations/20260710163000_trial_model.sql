-- Pricing Part 2: card-optional 14-day trial model.
-- Replaces the free/plus `subscription_tier` with an explicit subscription
-- lifecycle. The card is collected at trial end (Part 3), not at signup, so
-- the trial is tracked here, not in Stripe.
alter table profiles
  add column if not exists subscription_status text not null default 'trialing',
    -- trialing | active | past_due | canceled | lifetime
  add column if not exists trial_ends_at timestamptz,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists current_period_end timestamptz,
  add column if not exists plan text;  -- monthly | annual | lifetime

comment on column profiles.subscription_tier is
  'DEPRECATED 2026-07-10: replaced by subscription_status. Do not read.';

-- Backfill existing rows to a FRESH 14-day trial from now(). The spec suggested
-- created_at + 14 days, but since middleware now redirects expired trials to
-- /subscribe and Stripe checkout is not wired until Part 3, dating the trial
-- from created_at would instantly soft-lock existing accounts (including the
-- reviewer's) with no way to subscribe. Card-optional / learning-phase posture:
-- give everyone a clean 14 days from the migration instead.
update profiles set trial_ends_at = now() + interval '14 days' where trial_ends_at is null;
update profiles set subscription_status = 'trialing' where subscription_status is null;

-- New signups get a profile row with a 14-day trial, regardless of the
-- email-confirmation flow (web or mobile). SECURITY DEFINER so it can write the
-- row before the user has a session; ON CONFLICT keeps it idempotent.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, subscription_status, trial_ends_at)
  values (new.id, 'trialing', now() + interval '14 days')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- TODO (revisit ~2026-10-08, 90 days): reconsider card-REQUIRED at signup.
-- Card-required converts ~60-80% vs ~15-25% card-optional, but a brand-new
-- privacy-first product with zero social proof can't clear the card-before-value
-- trust barrier yet. Switch once there are 200+ testimonials.
