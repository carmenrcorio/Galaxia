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

`[FIXED]` **A checkout the backend refuses no longer reads as "something went
wrong, please try again".** The live failure is Stripe rejecting the checkout
session: `postCheckoutStart` answers HTTP 422 with backend code `8142`. That is
a permanent server-side setup rejection, and both the old catch-all and the
error-code buckets above put it in the generic retry bucket, telling the user to
do the one thing that cannot work. `purchaseErrorCopy` now has its own case for
it, and the copy says only what is provable: checkout did not open, it is our
side, and it does not promise that trying again will help. It names no cause,
which is the whole point, since the app cannot see why Stripe refused.

`[DECISION]` **The rejection is detected from the underlying message, never from
the RevenueCat error code.** The same failure reaches the paywall with two
different codes. Thrown straight out of an SDK call it is `UnknownBackendError`
(16) with the backend code on `extra`; through the checkout modal, the SDK's own
error handler rebuilds it via `getForPurchasesFlowError`, which remaps the code
to `StoreProblemError` (2) and **drops `extra` entirely**. Only
`underlyingErrorMessage` survives both, shaped as `Request: <endpoint>. Status
code: <status>. Body: <body>.`, so `isCheckoutSetupRejection` reads the backend
code from `extra` or from that body, and independently treats a `postCheckout*`
endpoint answering 422 as a refusal. Keying on code 16 alone would have missed
the live path.

`[TESTED]` **Driven in a real browser through the real SDK on a production
build, with the RevenueCat backend responses controlled.** Three runs, each
clicking **Continue with Galaxia** for real: `checkout/start` answering 422 with
code 8142, answering 503 with code 7110, and answering 200. The rejection run
settles as **`rcErrorCode: 2`**, not 16, with `extra` gone and
`backendErrorCode: 8142` recovered from `underlyingErrorMessage` alone. That is
the predicted re-wrap, observed, and direct evidence that a code-16 check would
not have fired on the live failure. The 503 run reports
`checkoutSetupRejected: false` and keeps the generic copy, so the new case is a
genuine split rather than a blanket rewrite; the 200 run logs nothing and shows
no error. The temporary unauthenticated harness page used to reach the paywall
without Supabase was deleted before commit.

`[ADDED]` **The real backend code is logged as its own field.**
`logPurchaseFailure` now records `backendErrorCode` (from `extra`, else parsed
from the response body), `backendHttpStatus`, `backendRequest` and
`checkoutSetupRejected` alongside the RevenueCat code, so `8142` is greppable
instead of buried mid-string. `parseRcBackendFailure` is parsing only: a field
that is not in the error is logged as null rather than inferred (ENGINEERING.md
§12). Console only, nothing new reaches the screen (§7).

`[ADDED]` **`docs/purchase-path-verification.md`**, the phone-runnable
checklist for the live URL once Stripe onboarding is done: test card
`4242 4242 4242 4242`, confirming `checkout/start` returns 200 rather than 422,
the real webhook delivering 2xx, `profiles.subscription_status` flipping to
`active`, and the app unlocking and staying unlocked across a reload. The
webhook is deliberately not mocked: it is the only writer of paid status, so a
simulated one would prove the column and not the purchase.

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

`[OPEN]` **RevenueCat's own checkout sheet shows the user the raw backend
number first.** Before our copy is reachable, the SDK's checkout modal renders
its own error page reading "Something went wrong. Purchase not started due to an
error (error code: 8142)." with a **Try again** button, and our `catch` only runs
once that button is pressed. So the first thing the user reads is generic, and
it puts an internal number on screen, which is what ENGINEERING.md §7 exists to
prevent. That page is inside `purchases-js` and `purchase()` exposes no option to
suppress or retitle it, so it is not fixable from our side without leaving the
SDK's prebuilt checkout. Recorded, not worked around. Worth raising with
RevenueCat or revisiting if we ever move off their hosted sheet.

`[OPEN]` **`cancel-subscription.tsx` still has the generic fallback.**
`apps/web/components/cancel-subscription.tsx` falls back to the identical
"Something went wrong. Please try again." string when the cancel route returns
no error of its own. Same class of problem as the purchase path, different
route, deliberately left alone here so this PR stays one thing. Separate task.

`[OPEN]` **Two older strings in `purchaseErrorCopy` still contain em dashes.**
The pending-payment and misconfiguration messages authored earlier on this
branch use em dashes, against the house rule for authored copy. Not rewritten
here because they are copy the founder may already have read, and rewriting them
is a voice decision rather than a fix. The new checkout-rejection string is em
dash free and pinned by a test.

`[OPEN]` **Sandbox purchases grant real access.** The webhook does not read
`event.environment`, so a SANDBOX `INITIAL_PURCHASE` writes `subscription_status
= active` on the real profile row, and a sandbox subscription's accelerated
lifecycle (RevenueCat renews a monthly sandbox sub roughly every 5 minutes, at
most six times, then cancels it) will later flip that same row to `canceled`.
This is what makes a test-mode purchase provable end to end, and it is fine while
testing with our own accounts. Whether production should ignore sandbox events is
not decided here.
