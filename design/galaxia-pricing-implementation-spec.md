# Cursor Task — Pricing, Trial, Paywall & Cancellation

## 0. Read first

All copy for this task is committed at **`design/galaxia-pricing-copy.md`**. Do not write your own pricing copy. Do not paraphrase, shorten, or "improve" it. Render it verbatim. If a string does not fit a layout, change the layout. Voice rules are documented at the top of that file.

Also read `ENGINEERING.md` and `CHANGELOG.md` at the repo root and follow them.

**The pricing model, decided. Do not propose freemium.**
- No free tier.
- 14-day free trial, full access, card required at signup, one-click cancel.
- **One paid tier: $9.99/month or $89/year (26% off).** Unlimited people. Nothing is gated.
- Optional, behind a feature flag: founding-member lifetime, $149, first 500 users.

**Never gate on the number of people.** Adding a grandmother must not cost anything. Value compounds with people added; a people cap caps the product's own aha moment.

**Constraint change from previous tasks:** you are now explicitly permitted to modify `apps/web/app/page.tsx` (the marketing landing) for Part 6 only, to add a pricing section. Preserve its existing design, tokens, animations, and all existing copy exactly. Add, do not rewrite.

**Still do not touch:** `next.config.mjs` core config, the root `.npmrc`, Vercel project settings. Do not add a root `vercel.json`.

---

## Part 1 — Remove every freemium remnant

The app currently assumes a freemium model. Find and remove all of it.

- `/app/settings`: the "Galaxia+ — coming soon" upsell card and its "Notify me when it's available" button. There is no Galaxia+. There is one tier.
- `/welcome` and anywhere else: the **"Free plan: 5-person limit reached"** gate. This is verified to actually block adding a sixth person. Delete the cap entirely. There is no limit on people.
- Search the codebase for: `free plan`, `5-person`, `personLimit`, `FREE_LIMIT`, `Galaxia+`, `tier === "free"`, `subscription_tier`. Report every hit and what you did with it.
- `/account`: the "Manage subscription" surface must reflect the real model (one tier, trial or active or canceled), not a free/plus split.

---

## Part 2 — Data model and trial state

The `profiles` table has a `subscription_tier` column (`free`/`plus`) from migration `20260629233000_add_subscription_tier.sql`. That model is wrong now. Write a **new migration** (never edit an applied one) that adds:

```sql
alter table profiles
  add column if not exists subscription_status text not null default 'trialing',
    -- trialing | active | past_due | canceled | lifetime
  add column if not exists trial_ends_at timestamptz,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists current_period_end timestamptz,
  add column if not exists plan text;  -- monthly | annual | lifetime
```

Keep `subscription_tier` for now but stop reading it; mark it deprecated in a comment. Backfill existing rows: `subscription_status = 'trialing'`, `trial_ends_at = created_at + interval '14 days'`.

On signup, set `trial_ends_at = now() + interval '14 days'` and `subscription_status = 'trialing'`.

**Entitlement rule, one function, used everywhere (web and mobile):**
```
hasAccess = status === 'active'
         || status === 'lifetime'
         || (status === 'trialing' && trial_ends_at > now())
```
Put it in `packages/core` so `apps/web` and `apps/mobile` share it. Enforce it server-side in middleware for `/app/*` and `/welcome`, not only in the UI.

---

## Part 3 — Stripe

Use Stripe Checkout and the Customer Portal. Do not build custom card forms.

- Products: one product, three prices — `monthly` ($9.99), `annual` ($89.00), `lifetime` ($149.00 one-time, behind a `NEXT_PUBLIC_FOUNDING_ENABLED` flag).
- Trial: create the subscription with `trial_period_days: 14`, card collected up front.
- Route `POST /api/checkout` → creates a Checkout Session for the chosen price, returns the URL.
- Route `POST /api/portal` → creates a Billing Portal session for `stripe_customer_id`.
- Route `POST /api/webhooks/stripe` → handle `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`. Update `subscription_status`, `plan`, `current_period_end`, and the Stripe ids on `profiles`. Verify the webhook signature. This route must be exempt from auth middleware.
- Env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PRICE_MONTHLY`, `NEXT_PUBLIC_STRIPE_PRICE_ANNUAL`, `NEXT_PUBLIC_STRIPE_PRICE_LIFETIME`, `NEXT_PUBLIC_FOUNDING_ENABLED`. Server keys must never reach the browser.

The webhook is the source of truth for `subscription_status`. Never set it from the client.

---

## Part 4 — The paywall

New route `/subscribe`, and a `<Paywall />` component reused in Settings and Account.

Copy verbatim from `design/galaxia-pricing-copy.md` §1. Structure:
- Eyebrow `YOUR TRIAL HAS ENDED`, Fraunces headline "Keep your galaxy.", the body line, then two price cards.
- **Annual is pre-selected and marked "Best value."** Show `$89 /year`, `$7.42 a month · save 26%`. Monthly shows `$9.99 /month`.
- Primary button `Continue with Galaxia` → `/api/checkout`.
- Directly beneath, in mist grey: "Cancel in one click, any time. We'll email you before we ever charge you again."
- The five "what's included" items, verbatim. No tiers, no comparison table, no asterisks.

Design: use the existing `.glass-card` recipe, Fraunces headings, gold pill primary button, the cosmic background. It must look like the marketing landing, not a billing page.

**No dark patterns.** No countdown timer, no fake scarcity, no "don't miss out." If the founding-member offer is enabled, show a **real** remaining count from the database.

**Access behavior when the trial expires:** the user is redirected to `/subscribe`. Their data is never deleted. `/account` stays reachable so they can export or cancel. Show a persistent, calm banner during the trial: `Trial ends {{date}}` with a link to `/subscribe`.

---

## Part 5 — Cancellation, one screen, one click

Copy verbatim from `design/galaxia-pricing-copy.md` §4.

- Headline "Cancel your subscription?", the two body lines, primary button `Cancel subscription`, secondary link `Never mind, keep Galaxia`.
- **No retention offer. No discount. No pause option. No survey before the button. No multi-step flow.**
- After cancellation is confirmed, optionally ask one question, clearly marked optional.
- Access continues until `current_period_end`.

This is a deliberate competitive position: the category's 1-star reviews are dominated by hostile cancel flows. Do not add friction here under any circumstances.

---

## Part 6 — Marketing site pricing section

Add a pricing section to `apps/web/app/page.tsx`, between the FAQ section and the closing `#join` section. Give it `id="pricing"` and add a `Pricing` link to the nav.

- Eyebrow `PRICING`. Fraunces H2: **One price. Everyone you love.**
- Body: "No tiers, no add-ons, no limit on how many people you can add. Fourteen days free to try all of it."
- The two price cards (annual pre-selected/highlighted, exactly as §1).
- The five included items, verbatim.
- The reassurance line: "Cancel in one click, any time."
- Primary CTA: `Start 14 days free` → `/signup`.

Match the existing landing page exactly: same tokens, same `.glass` recipe, same type scale, same reveal-on-scroll animation. Do not alter any existing section, copy, or animation on that page.

Also update the hero and closing CTAs from "Request early access" to **`Start 14 days free`**, linking to `/signup`. Keep the email-capture form as a secondary "notify me" only if the founding-member flag is off; otherwise remove it — we are open for signups now.

---

## Part 7 — Trial emails

Copy verbatim from `design/galaxia-pricing-copy.md` §3. Send via Resend (`RESEND_API_KEY`); if the key is absent, no-op silently and log.

Five emails, triggered by a scheduled job (Supabase cron or a Vercel cron route):
1. **Day 1**, after their first person is added.
2. **Day 4, if `people_count >= 2`** — "What {{person_name}} needs from you."
3. **Day 4, if `people_count == 1`** — "Galaxia needs one more person." *(This is the highest-leverage email in the product. A user with one person will not convert; nothing in Galaxia works with one star. Build this branch first.)*
4. **Day 11** — the honest reminder, three days out, with real counts of people, notes, Vela threads, named constellations, and a cancel link above the continue link.
5. **Day 14, if not converted** — "Your galaxy is still here." Confirm nothing was charged and nothing was deleted.

Every email must render the user's real numbers. Never fabricate a count.

---

## Part 8 — Acceptance criteria

- Searching the codebase for `free plan`, `5-person`, `Galaxia+`, `FREE_LIMIT` returns nothing user-facing.
- A brand-new signup can add **six or more** people with no gate.
- `subscription_status` is `trialing` with `trial_ends_at` 14 days out; middleware grants access.
- When `trial_ends_at` passes, `/app/*` redirects to `/subscribe`; no data is deleted; `/account` remains reachable.
- Stripe Checkout completes and the webhook flips `subscription_status` to `active`; access is restored without a manual refresh.
- Cancelling takes exactly one click from `/account` and presents no retention offer.
- The paywall and the marketing pricing section render the copy from `design/galaxia-pricing-copy.md` **verbatim**, in the landing page's visual language.
- Annual is the pre-selected option in both places.
- The day-4 one-person email branch exists and fires.

## Report

Root cause of anything unexpected, branch name, PR link, files changed, deploy status, live URL. Append to `CHANGELOG.md` in the same PR. **Report explicitly anything you skip or defer** rather than omitting it.

## Suggested order

Part 1 (remove freemium) → Part 2 (data model) → Part 4 (paywall UI, static) → Part 3 (Stripe) → Part 5 (cancel) → Part 6 (marketing) → Part 7 (emails).

Stop after Part 4 and show me the paywall before wiring Stripe.
