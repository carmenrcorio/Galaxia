# RevenueCat Web Billing — mode alignment checklist

Written for the live purchase failing with **RevenueCat error code 16**. Code 16
is `UnknownBackendError` in `@revenuecat/purchases-js` — RevenueCat's backend
refused the purchase rather than the SDK rejecting it locally. It has no single
cause, so the cause has to be **read** out of the RevenueCat dashboard, not
guessed. This is the reading order.

Every RevenueCat statement below is from RevenueCat's own docs (linked inline)
or verified in the installed SDK source. Where their dashboard labels may have
moved, the doc link is the authority, not this file.

## Check the billing engine before the mode

The mode question (test vs live) assumes the key is even for the right billing
engine, and that is worth confirming first, because `purchases-js` accepts **four
different key families**: RevenueCat Billing (`rcb_`), Stripe Billing (`strp_`),
Paddle (`pdl_`) and Test Store (`test_`). A key from the wrong family still
configures cleanly and then fails **at RevenueCat's backend** — which is what a
code 16 looks like. Only a mobile SDK key (`appl_`/`goog_`/`amzn_`) or a secret
key (`sk_`) is rejected locally, and that is a code 11, not 16.

**Concretely: the `NEXT_PUBLIC_REVENUECAT_PUBLIC_KEY` present in the Cursor agent
environment is a `strp_…` Stripe Billing key, not an `rcb_…` RevenueCat Billing
key.** That is only the value in the agent VM (Cursor secrets) and says nothing
certain about what Vercel holds, so read Vercel yourself in step 1. But if the
same value is in Vercel, that is a mismatch worth resolving before anything else:
Stripe Billing and RevenueCat Billing are **separate web configs** in RevenueCat,
each with their own products and offerings
([Configuring Payments](https://www.revenuecat.com/docs/tools/funnels/configuring-payments)),
and the paywall reads `offerings.current.monthly`, which only resolves if the
offering exists in the config that key belongs to.

Either engine can work. What cannot work is a key for one config and products
and offerings set up in the other.

## The rule we are aligning to

**Everything in ONE mode.** The key in the app, the web config's Stripe
connection, and Stripe itself must all be test/sandbox, or all be live.

Since the Stripe keys currently in play are **test** keys, align everything to
**test/sandbox now**, prove one purchase end to end, then swap all of it to live
**together** later. The swap is a value change only: the env var names never
change, so nothing in the code and nothing in Vercel's variable list gets
renamed.

### One correction to the premise, because it changes what "aligned" means here

A sandbox key is **not** RevenueCat-internal-only. Per RevenueCat's own
[Connect your Stripe Account](https://www.revenuecat.com/docs/web/connect-stripe-account)
and [Testing Purchases](https://www.revenuecat.com/docs/web/web-billing/testing)
docs, for RevenueCat Billing on a Stripe account that has **Test Mode**:

- "RevenueCat will automatically use Stripe's test mode for sandbox web purchase
  links **and web SDK purchases**."
- "You should use Stripe's test cards in any RevenueCat sandbox purchase."
- "You only need to create a single RevenueCat Billing platform."

So the sandbox `rcb_sb_…` key **is** the correct key for a real Stripe test-mode
checkout with card `4242 4242 4242 4242`. Aligning to test mode means *using the
sandbox key*, not avoiding it.

The reverse is the sharp edge, and it is the highest-signal thing to check
first: "If your connected Stripe account doesn't have access to live mode, only
RevenueCat **sandbox** purchases can be made (only sandbox API keys and web
purchase links will be available)." A production `rcb_` key against a Stripe
connection that cannot take live payments is a backend-side refusal — the shape
of failure that surfaces as a code, not as a clear message, in the SDK.

## What the code does and does not decide

Verified in this repo, on this branch:

- The mode is **purely env-driven**. `NEXT_PUBLIC_REVENUECAT_PUBLIC_KEY` is read
  once in `apps/web/lib/env.ts` and passed straight to `Purchases.configure` in
  `apps/web/components/paywall.tsx`. Nothing else influences it.
- Nothing hardcodes or assumes a mode. There is no sandbox/test/live flag, no
  branch on mode, and no test-vs-live URL anywhere in the app. The one
  RevenueCat REST host, `https://api.revenuecat.com/v2` in
  `apps/web/app/api/cancel/route.ts`, is the same host in both modes; which mode
  that route acts in is decided by `REVENUECAT_SECRET_KEY`.
- The app holds **no Stripe key**. Under Web Billing, RevenueCat talks to
  Stripe; the app never does. `STRIPE_SECRET_KEY` in `apps/web/lib/env.ts` is
  unused and documented as such.
- The webhook does **not** filter on `event.environment`, so a SANDBOX purchase
  writes `subscription_status` exactly like a production one. That is what makes
  a test-mode purchase provable end to end. RevenueCat says the same thing from
  their side: "sandbox URLs can be tied to real entitlements." It also means a
  sandbox purchase grants real access to that account — fine while testing with
  your own account, worth revisiting before launch.

**So changing the key value alone is enough on the code side.** No different
code needs to ship; only a redeploy that picks up the new env value.

## 1. Read the key the app is actually using

**Vercel** — project `galaxia` → Settings → Environment Variables →
`NEXT_PUBLIC_REVENUECAT_PUBLIC_KEY` → reveal the value for the environment you
are testing (Production, and Preview too if you test preview URLs).

**Cursor** — Dashboard → Cloud Agents → Secrets. Cursor secrets only reach agent
VMs. **They do not affect your deployed site.** A value that exists only in
Cursor is not on the live site at all.

The prefix is the marker:

| Prefix | What it is | Behaviour |
| --- | --- | --- |
| `rcb_sb_…` | RevenueCat Billing **sandbox** key | Purchases via Stripe **test mode**, test cards only |
| `rcb_…` (no `sb_`) | RevenueCat Billing **production** key | Real money; needs Stripe live mode |
| `strp_…` | **Stripe Billing** key — a different web config | Configures fine, then needs *that* config's products/offering |
| `pdl_…` | Paddle Billing key — a different engine again | Configures fine, needs a Paddle config |
| `test_…` | RevenueCat Test Store key | Simulated purchases only |
| `appl_…`, `goog_…`, `amzn_…` | a mobile SDK key, wrong product | Rejected locally, code 11 |
| `sk_…` | a **secret** key; never belongs in a `NEXT_PUBLIC_` var | Rejected locally, code 11 |

That table is the SDK's own rule, not an inference: `purchases-js` sets its
sandbox flag from `key.startsWith("rcb_sb_")`, and rejects any key outside
`rcb_`/`pdl_`/`test_`/`strp_` with "Invalid API key. Use your Web Billing API
key." — error code **11**. So a 16 tells you the key was accepted locally and the
refusal came from RevenueCat's backend.

Note that **only `rcb_` keys carry the mode in the prefix.** For a `strp_` or
`pdl_` key the mode belongs to the connected Stripe/Paddle account, not to the
key, so there is nothing to read off the prefix — go to section 3.

**Fastest read of all: the app now reports which key it is using.** Open
`/subscribe`, open the browser console, click "Continue with Galaxia" and let it
fail. The `[billing] purchase failed` line reports:

- `keyKind` — `revenuecat-billing-sandbox` / `revenuecat-billing-production` /
  `stripe-billing` / `paddle-billing` / `test-store` / `mobile-sdk-key` /
  `secret-key` / `unrecognized` / `missing`
- `sdkReportsSandbox` — the SDK's own verdict on the key it was configured with
- `rcErrorCode`, `rcMessage`, `rcUnderlyingMessage` — RevenueCat's own reason

No key, no user id, nothing secret is printed, and none of it appears on screen.

## 2. See which key is which in RevenueCat

Public keys for a web config live under **Apps & Providers → Configurations →
your web configuration**; project-wide keys are under **Project settings → API
keys** ([API Keys & Authentication](https://www.revenuecat.com/docs/welcome/authentication)).
A properly provisioned RevenueCat Billing config shows **both** a public
production key and a sandbox key.

While you are there, note **how many web configs exist and of what type** — a
RevenueCat Billing config, a Stripe Billing config, or both. That tells you which
family the key in Vercel belongs to, and which config has to hold the monthly
product and the offering for the paywall to resolve `offerings.current.monthly`.

Aligned looks like: the value in Vercel is character-for-character a key from the
config that owns your products and offering, and you know which one it is.

**If only the `rcb_sb_…` sandbox key is listed and there is no production
`rcb_…` key at all, that is itself the finding** — per the Stripe connection doc
above, RevenueCat only exposes sandbox keys when the connected Stripe account
has no live-mode access. In that state, test/sandbox is the only mode available
to you, which settles the question of which mode to align to.

To confirm which key the *running app* is using, use the console line from
step 1 rather than trusting what Vercel appears to hold.

## 3. Check the Stripe connection's mode

Two different Stripe testing mechanisms exist, and they need different
RevenueCat setups
([Connect your Stripe Account](https://www.revenuecat.com/docs/web/connect-stripe-account)):

- **Stripe Test Mode** (the test/live toggle inside one account) — RevenueCat
  uses it automatically for sandbox purchases. **One** RevenueCat Billing config
  is enough.
- **Stripe Sandboxes** (newer, isolated standalone accounts) — you must install
  the RevenueCat Stripe app *inside that sandbox*, and create **two** RevenueCat
  Billing configs, one per Stripe connection, selecting the right Stripe account
  on each.

Then check, in this order:

1. **RevenueCat → Account settings → connected Stripe accounts.** Which Stripe
   account is connected, and does it show a live/test mode? A brand-new,
   unverified Stripe account may have **no live mode at all**.
2. **RevenueCat → Apps & Providers → your RevenueCat Billing config → Stripe
   account.** Confirm the config points at the Stripe connection you think it
   does. If you connected a Stripe *sandbox*, confirm there is a dedicated
   config for it, per the doc above.
3. **Stripe → Developers → API keys**, in the account and mode the config points
   at: `pk_test_…` / `sk_test_…` = test, `pk_live_…` / `sk_live_…` = live.
4. **The monthly product and offering.** A Stripe price created in test mode does
   not exist in live mode, and a Stripe sandbox is a separate account whose
   products must be created there too. Confirm the offering RevenueCat serves is
   attached to a product that exists in the mode you are purchasing in — the
   paywall takes `offerings.current.monthly`, so that specific package must
   resolve.

Aligned looks like: the key's mode from step 1, the config's Stripe connection,
that connection's mode, and the offering's product all name the same mode.
Given your Stripe keys are test keys, all four should read test/sandbox now.

## 4. Find the recorded reason for the error-16 attempt

1. **Customers** → search the App User ID, which is your **Supabase `user.id`**
   (we set it deliberately, so one RevenueCat customer maps to one `profiles`
   row). Get it from Supabase → Authentication → Users.
2. On that customer, read the **Customer History** card — RevenueCat describes
   it as "a timeline of transactions and activity … useful for debugging and
   triaging support issues"
   ([Customer Profile](https://www.revenuecat.com/docs/dashboard-and-metrics/customer-profile)).
   Note whether entries are marked **Sandbox**, and note the timestamp. Their
   own caveat: timeline ordering mixes `purchase_at_ms` and `event_timestamp_ms`,
   so click into an event and read `event_timestamp_ms` rather than trusting the
   visual order.
3. **Project settings → Webhooks → the Galaxia webhook** → delivery log: which
   events fired, the response status, retries. A purchase that never completed
   produces **no `INITIAL_PURCHASE` here at all** — that is what separates "the
   purchase failed" from "the purchase worked and our webhook didn't land."
4. **Stripe → Payments / Logs**, in the account and mode from step 3. If Stripe
   has no record of an attempted PaymentIntent at that timestamp, the refusal
   happened before Stripe was ever reached, which points at the RevenueCat
   config rather than at the card.
5. If nothing above records a reason, RevenueCat support can read the backend
   rejection for a specific customer id and timestamp; a code 16 is their side
   by definition.

**Send back:** the App User ID, its Customer History entry (screenshot is fine)
with the Sandbox/Production marker and `event_timestamp_ms`, whether Stripe shows
a payment attempt at that time, and the `[billing] purchase failed` console
object from step 1. Those four identify the cause without anyone guessing.

## 5. Env vars the purchase + webhook flow actually need

All of these must be set **in Vercel**, on the `galaxia` project, for the
environment you are testing — and **Vercel needs a redeploy after adding or
changing any of them.** `NEXT_PUBLIC_*` values are inlined at build time and the
rest are read by running functions; neither picks up a change without a new
deployment. Setting them in Cursor only affects agent VMs.

| Var | Used by | Missing → |
| --- | --- | --- |
| `NEXT_PUBLIC_REVENUECAT_PUBLIC_KEY` | paywall, in the browser | "Payments aren't available yet" |
| `REVENUECAT_SECRET_KEY` | `POST /api/cancel`, server only | 503 naming the var |
| `REVENUECAT_WEBHOOK_AUTH` | `POST /api/webhooks/revenuecat`, server only | 503 naming the var; webhook grants nothing |
| `REVENUECAT_PROJECT_ID` | `POST /api/cancel`, server only | 503 naming the var |
| `NEXT_PUBLIC_SUPABASE_URL` | auth, profile reads, webhook writes | webhook 500; no auth |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | auth, profile reads | no auth |
| `SUPABASE_SERVICE_ROLE_KEY` | webhook + cancel status writes | webhook 500; status never flips |

`REVENUECAT_SECRET_KEY`, `REVENUECAT_WEBHOOK_AUTH`, `REVENUECAT_PROJECT_ID` and
`SUPABASE_SERVICE_ROLE_KEY` must **never** carry a `NEXT_PUBLIC_` prefix — that
publishes them in the browser bundle.

`REVENUECAT_WEBHOOK_AUTH` is compared byte for byte against the `Authorization`
header RevenueCat sends, so it must be the **whole** header value: if RevenueCat
is configured to send `Bearer abc123`, the env value is `Bearer abc123`,
including the prefix. It fails closed — unset gives 503, wrong gives 401, and
nothing gets paid status either way.

## 6. End-to-end test, once the modes match

1. **Confirm the key and mode first.** `/subscribe` → console → the `[billing]`
   line's `keyKind` and `sdkReportsSandbox` must agree with the config and mode
   you found in sections 2–3. Do not start a purchase before they agree.
2. Sign in as a test account. Note its Supabase `user.id`.
3. `/subscribe` → **Continue with Galaxia** → pay with Stripe test card
   `4242 4242 4242 4242`, any future expiry, any CVC, any postcode.
4. RevenueCat → Customers → that `user.id`: an active
   **`GalaxiaMea App Unlimited`** entitlement appears. The string must match
   exactly; the paywall's post-purchase check is a literal key lookup.
5. RevenueCat → Webhooks: the `INITIAL_PURCHASE` delivery is **2xx**.
6. Supabase → `profiles` row for that id: `subscription_status` = `active`,
   `plan` = `monthly`, `current_period_end` set, `cancel_at_period_end` = false.
7. The paywall shows "✦ You're in." and lands you in `/app` — unlocked. It polls
   the profile for up to ~18s waiting for the webhook, so a slow webhook shows
   "Setting up your account…" and then an "Open Galaxia" link rather than
   failing.
8. Optional round trip: Settings → cancel. `cancel_at_period_end` becomes true
   while `subscription_status` stays `active` — access continues to period end by
   design; only `EXPIRATION` flips it to `canceled`.

**Expect sandbox time to be compressed.** RevenueCat's
[testing doc](https://www.revenuecat.com/docs/web/web-billing/testing) gives a
monthly (P1M) sandbox subscription a **~5 minute** renewal period, renewing at
most **six times** before being automatically cancelled. Our webhook treats
those sandbox events as real, so a sandbox test account will renew every few
minutes and then, after the final cancellation and `EXPIRATION`, flip to
`canceled` and lose access roughly half an hour in. That is correct behavior,
not a regression — do not debug it as one, and do not use a sandbox purchase to
test anything long-lived.

If step 6 does not happen but steps 4–5 do, the problem is
`REVENUECAT_WEBHOOK_AUTH` or `SUPABASE_SERVICE_ROLE_KEY` — not the purchase.

## 7. When you switch to live

Change values only, all together, then redeploy:

- `NEXT_PUBLIC_REVENUECAT_PUBLIC_KEY` → the production `rcb_…` key.
- `REVENUECAT_SECRET_KEY` → the production secret key.
- RevenueCat's Stripe connection → a Stripe account with **live mode** enabled
  (account verification complete), with the monthly product and offering
  existing in that account and mode.

Then repeat section 6 with a real card on the smallest possible charge and refund
it. Test-mode success does not carry over — it is a different Stripe mode, and
in the Stripe-sandbox case a different Stripe account entirely.
