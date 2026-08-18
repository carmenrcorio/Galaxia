## RevenueCat purchase flow — diagnosable failures and mode checklist (branch `cursor/fix-revenuecat-purchase-flow-b0ac`) — 2026-08-18

**Trigger**: a live purchase failed with RevenueCat error code 16 and the paywall
reported only "Something went wrong", so there was nothing to diagnose from. The
entitlement-id half of the report (`GalaxiaMea App Pro` → `GalaxiaMea App
Unlimited`) was already fixed and on `main` in #64; this branch does not touch it
beyond pinning it with a test.

`[ADDED]` **The paywall now reports why a purchase failed, to the console only.**
`logPurchaseFailure` in `apps/web/components/paywall.tsx` logs the RevenueCat
error code, message and underlying message, plus which key the attempt ran on
(`keyKind` from the new `rcKeyKind` helper, and the SDK's own `isSandbox()`). No
key, user id or session detail is printed and none of it reaches the screen
(ENGINEERING.md §7). Code 16 is `UnknownBackendError` — a RevenueCat-side
refusal — and it is not diagnosable without knowing which key produced it.

`[DECISION]` **`rcKeyKind` names the billing engine, not just sandbox vs
production.** `purchases-js` accepts four key families — RevenueCat Billing
(`rcb_`), Stripe Billing (`strp_`), Paddle (`pdl_`) and Test Store (`test_`) —
and only rejects a mobile (`appl_`/`goog_`/`amzn_`) or secret (`sk_`) key
locally. A key for the wrong *engine* therefore configures cleanly and fails at
the backend, indistinguishable from a payment problem, which is precisely the
shape of a code 16. Reporting the family makes that visible; verified in a
browser against the live RevenueCat backend for `rcb_sb_`, `rcb_`, `strp_` and
`appl_` keys.

`[CHANGED]` **Purchase failures say only what the error code establishes.**
`purchaseErrorCopy` in `apps/web/lib/revenuecat.ts` replaces the single
"Something went wrong" catch-all: a pending payment is no longer reported as a
failure (and tells the user not to pay twice), a misconfiguration no longer asks
the user to retry something that cannot succeed, and no message claims whether a
charge happened when we do not know (ENGINEERING.md §12). Kept SDK-free so the
webhook route can still import this module — the RevenueCat error codes are
mirrored by value in `RC_ERROR_CODE`.

`[FIXED]` **A purchase can no longer be attributed to a stale RevenueCat
customer.** The SDK may only be configured once per page load, so the previous
`if (!Purchases.isConfigured()) configure(...)` left a configured instance
pointing at whoever signed in first. If a second user signed in without a full
reload, their payment would have entitled the first user's RevenueCat customer.
`purchasesForUser` now calls `changeUser` when the configured App User ID is not
the signed-in Supabase `user.id`.

`[ADDED]` **`docs/revenuecat-billing-mode-checklist.md`** — the dashboard-side
reading order for a code 16 (which key, which Stripe connection mode, where the
recorded reason lives), the env vars the flow needs and the reminder that they
must be in Vercel with a redeploy, and the end-to-end test with Stripe test card
`4242 4242 4242 4242`.

`[DECISION]` **Mode stays purely env-driven.** Nothing in the app hardcodes or
branches on test vs live; the mode is entirely the value of
`NEXT_PUBLIC_REVENUECAT_PUBLIC_KEY` (and `REVENUECAT_SECRET_KEY` for the cancel
route). Switching modes is a value change plus a redeploy — never a code change,
and never a rename.

`[OPEN]` **Sandbox purchases grant real access.** The webhook does not read
`event.environment`, so a SANDBOX `INITIAL_PURCHASE` writes `subscription_status
= active` on the real profile row, and a sandbox subscription's accelerated
lifecycle (RevenueCat renews a monthly sandbox sub roughly every 5 minutes, at
most six times, then cancels it) will later flip that same row to `canceled`.
This is what makes a test-mode purchase provable end to end, and it is fine while
testing with our own accounts. Whether production should ignore sandbox events is
not decided here.
