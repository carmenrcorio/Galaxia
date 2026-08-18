# Purchase path verification (live, from a phone)

Run this once the Stripe account onboarding is finished, on the **live URL**, on
the phone you would actually buy on. It is the end-to-end proof that the money
path works: checkout opens, the card is taken, RevenueCat's real webhook lands,
the profile row flips, and the app unlocks.

**Nothing here is mocked.** Do not hand-post a webhook body, do not use
RevenueCat's "send test event", and do not write `subscription_status` by hand.
The webhook is the only writer of paid status, so a simulated one proves the
database column and nothing about the purchase that is supposed to set it. If
you shortcut it, you have tested the shortcut.

For the dashboard-side reading order when something fails, and for the switch
from test to live, see `docs/revenuecat-billing-mode-checklist.md`.

## Before you start

- A throwaway Galaxia account you are happy to leave subscribed. Have its
  Supabase `user.id` to hand: it is the RevenueCat App User ID and the
  `profiles.id`, so it is the one key that joins all three systems.
- Logins for the RevenueCat and Supabase dashboards. Both work in a phone
  browser, which is the point of this checklist.
- Card `4242 4242 4242 4242` only works while the Stripe connection is in
  **test** mode. If you are verifying live mode, use a real card on the smallest
  charge and refund it. Everything else below is identical.

## The checklist

1. **Sign in on the live URL** as the test account, on the phone. Open
   `/subscribe`. The paywall should offer Monthly at $9.99.

2. **Tap "Continue with Galaxia". This step is the `checkout/start` check.**
   What happens next is the response to that call, so you can read it without
   any tooling:

   - **A payment sheet with card fields slides up.** `checkout/start` returned
     **200**. The session was created. Continue to step 3.
   - **The paywall says "We couldn't start checkout on our end."** The call was
     rejected again, which is the 422. **Stop here.** Stripe is not healthy yet
     and nothing further in this checklist can pass. Nothing was charged,
     because no session was ever created.
   - Any other error copy means a different failure. Take it to the mode
     checklist rather than continuing.

   To see the literal status code rather than the symptom, open the same page in
   a desktop browser with the console open. A rejection logs one
   `[billing] purchase failed` line carrying `backendHttpStatus`,
   `backendErrorCode` and `checkoutSetupRejected`. On a healthy path there is no
   such line at all.

3. **Pay** with `4242 4242 4242 4242`, any future expiry, any CVC, any postcode.

4. **Confirm the entitlement.** RevenueCat dashboard, Customers, search that
   `user.id`. It must show an active **`GalaxiaMea App Unlimited`** entitlement.
   The string has to match exactly: the paywall's post-purchase check is a
   literal key lookup, so a near-miss reads as "not subscribed".

5. **Confirm the real webhook was delivered and accepted.** RevenueCat
   dashboard, Webhooks, the delivery log. The `INITIAL_PURCHASE` event for this
   purchase must show a **2xx**. A 401 or 503 here means the webhook never got
   to write anything, and step 6 will fail no matter how long you wait.

6. **Confirm the profile flipped.** Supabase dashboard, Table editor,
   `profiles`, the row whose `id` is that `user.id`:

   - `subscription_status` = `active`
   - `plan` = `monthly`
   - `current_period_end` = a real future timestamp
   - `cancel_at_period_end` = false

   Read this row, do not edit it. If steps 4 and 5 passed and this did not, the
   problem is `REVENUECAT_WEBHOOK_AUTH` or `SUPABASE_SERVICE_ROLE_KEY` in
   Vercel, not the purchase.

7. **Confirm the app unlocks.** Back on the phone, the paywall shows
   "✦ You're in." and then lands you in `/app`, unlocked. It polls the profile
   for about eighteen seconds waiting for the webhook, so a slow webhook shows
   "Setting up your account…" and then an "Open Galaxia" link rather than an
   error.

8. **Confirm it survives a reload**, which is the difference between the client
   believing it and the database saying it. Hard-reload `/app`: still unlocked.
   Open `/subscribe` again: it now reads "You're already in." with a link to
   manage the plan, and offers no checkout.

## What each failure tells you

| Where it stops | What that means |
| --- | --- |
| Step 2, "couldn't start checkout" | Stripe still rejects the session. Onboarding is not finished. Nothing was charged. |
| Step 2, some other error | Not this bug. Read the console line and go to the mode checklist. |
| Step 4, no entitlement | The purchase did not complete, or the offering and entitlement are not wired in RevenueCat. |
| Step 5, non-2xx | Webhook auth or URL. Nothing downstream can pass. |
| Step 6, row unchanged | The webhook could not write. Check the service role key. |
| Step 7 or 8, still locked | Access is being read from somewhere other than the row. Do not patch the row; find the reader. |

## One expected oddity in test mode

A sandbox monthly subscription renews about every five minutes, at most six
times, and is then cancelled automatically. Our webhook treats those events as
real, so a test account will renew repeatedly and then flip to `canceled` and
lose access roughly half an hour in. That is RevenueCat's sandbox clock, not a
regression. Do not use a sandbox purchase to verify anything long-lived, and do
not debug the eventual lockout as a bug.
