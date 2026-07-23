## Settings cancel + billing management (branch `cursor/settings-cancel-billing-2bdf`) — 2026-07-23

**Trigger**: Landing page promises "cancel in one click, any time" but Settings had only
static marketing copy and no cancel control.

`[ADDED]` **`profiles.cancel_at_period_end` boolean** (migration
`20260723120000_cancel_at_period_end.sql`, applied to Galaxia
`eigfvribtntbxyjutsma`). UI-only flag: `subscription_status` stays `active` through
RevenueCat `CANCELLATION` so `@galaxia/core hasAccess` is unchanged. Settings can
honestly show "Canceled. Access until {current_period_end}." without locking the
user out mid-period.

`[CHANGED]` **`mapRevenueCatEvent` sets/clears the flag.** `CANCELLATION` →
`cancel_at_period_end: true`; `INITIAL_PURCHASE` / `RENEWAL` / `PRODUCT_CHANGE` /
`UNCANCELLATION` / `EXPIRATION` → `false`. Webhook writes the column.
`POST /api/cancel` also sets it optimistically after a successful RC cancel so
Settings updates before the webhook lands. Cancel remains cancel-at-period-end
via existing RC REST v2 `…/actions/cancel`; no reimplementation.

`[CHANGED]` **`/app/settings` Subscription card** reads real profile state
(trialing / active / past_due / canceled / lifetime, plus cancel-scheduled) and
links Cancel → `/account/cancel?from=settings` (reuses `CancelSubscription` +
`POST /api/cancel`). One click to reach, one confirm to execute. `/account`
cancel still works; its Cancel link hides when cancel is already scheduled.

`[ADDED]` **Manage billing via RevenueCat `CustomerInfo.managementURL`.** RC Web
Billing exposes a real Customer Portal (card update, invoices, uncancel). Settings
links it when the SDK returns a URL; if null, shows an honest
`mailto:support@galaxia.app` billing support link instead of a dead button. No
Stripe Portal invented from unused `stripe_*` columns.

`[CHANGED]` **Mobile Settings** shows the same cancel-scheduled copy when the
flag is set, and points users to web for cancel/billing (native cancel not in
this pass).
