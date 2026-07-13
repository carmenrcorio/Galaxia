## RevenueCat Web Billing (branch `cursor/revenuecat-web-billing-7547`) — 2026-07-12

**Trigger**: Wire real payments for `apps/web` (Option 1 — RevenueCat Web Billing).
Stripe now lives inside the RevenueCat dashboard; the app never talks to Stripe
directly. Monthly-only at launch (annual/lifetime aren't set up in RevenueCat).

`[ADDED]` **`@revenuecat/purchases-js` in `apps/web` only.** No mobile purchase
code (Apple still pending). New env in `apps/web/lib/env.ts`, each with a
readable "missing var" message: `NEXT_PUBLIC_REVENUECAT_PUBLIC_KEY` (public),
`REVENUECAT_SECRET_KEY` (server-only), `REVENUECAT_WEBHOOK_AUTH` (server-only
bearer token the webhook verifies), and `REVENUECAT_PROJECT_ID` (server-only,
required by the REST v2 cancel path). Stripe keys are not read by the app.

`[DECISION]` **RevenueCat App User ID = Supabase `user.id`.** Both the client
SDK (`Purchases.configure`) and the webhook key on `app_user_id = profiles.id`,
so web and future mobile map to ONE RevenueCat customer / ONE entitlement
(`GalaxiaMea App Pro`).

`[CHANGED]` **`paywall.tsx` no longer calls `POST /api/checkout`.** It does a
client-side RevenueCat purchase of the single Monthly product. The annual card
and the founding/lifetime block were removed (not set up). Status is never set
by the client; after purchase we only READ the profile to know the webhook has
landed, then continue into `/app`.

`[ADDED]` **`POST /api/webhooks/revenuecat` — the single source of truth for
paid status.** Verifies the `Authorization` header against
`REVENUECAT_WEBHOOK_AUTH` with a constant-time compare and fails closed
(unset secret → 503; missing/forged → 401). Looks up the profile by
`app_user_id` and, via the service-role client, maps events →
`subscription_status` / `current_period_end` / `plan`.

`[DECISION]` **CANCELLATION keeps the user `active`; only EXPIRATION →
`canceled`.** `@galaxia/core hasAccess` is unchanged and treats `canceled` as
no-access, so downgrading on CANCELLATION would lock a user out of a period they
already paid for. RevenueCat keeps access until the period ends (EXPIRATION), so
we do too.

`[CHANGED]` **`/api/cancel` wired to RevenueCat cancel-at-period-end** (REST v2:
list the customer's subscriptions, `POST …/actions/cancel`). It does not write
status — the webhook flips it. `[ADDED]` webhook mapping + auth-rejection tests
(`apps/web/lib/revenuecat.test.ts`).
