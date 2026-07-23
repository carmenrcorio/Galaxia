-- Cancel-at-period-end flag for honest Settings status.
-- subscription_status stays `active` until EXPIRATION (hasAccess unchanged).
-- This flag only drives UI: "Canceled. Access until {current_period_end}."
alter table profiles
  add column if not exists cancel_at_period_end boolean not null default false;

comment on column profiles.cancel_at_period_end is
  'True when auto-renew is off but access continues until current_period_end. Set by /api/cancel and RevenueCat CANCELLATION webhook; cleared on UNCANCELLATION/RENEWAL/INITIAL_PURCHASE/EXPIRATION. Does not affect hasAccess.';
