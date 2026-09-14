## Pricing page presentation (branch `cursor/pricing-page-presentation-6916`) — 2026-09-14

**Trigger**: Founder asked to refine `/pricing` so the page shows one honest monthly price, names that Vela is included and never metered, and states what is free without an account.

`[DECISION]` **Phase 0 diagnosis, recorded so it is not re-litigated.** Live user-facing prices in this repo:

- `/pricing` (`PricingSection`): **$9.99 per month**. One Monthly card. No yearly toggle.
- `/subscribe` paywall (`Paywall`): **$9.99 /month**. Purchases `offerings.current.monthly`.
- Homepage SoftwareApplication JSON-LD: **9.99 USD**, "14 day trial, then $9.99 per month."
- RevenueCat as referenced in code: `RC_PLAN = "monthly"`, entitlement `GalaxiaMea App Unlimited`, package `offerings.current.monthly`. Annual/lifetime are explicitly not set up and not offered.
- Signup (`/signup`): no dollar figure. "No credit card" in metadata. 14-day trial is implied by the nav CTA.
- Press kit: "a 14-day trial, then one honest monthly plan." No dollar figure.
- Homepage teaser, `/for-work`: "one honest plan" / 14 days free. No dollar figure.
- Settings: plan name "Monthly", no dollar figure.
- Trial emails: charge language without a dollar figure ("Nothing will be charged").
- App Store / Play Store listings (`content/store/`): no price.
- Founding-member offer: **not live**. `NEXT_PUBLIC_FOUNDING_ENABLED` exists in `env.ts` and is unread by any UI. No founding copy on `/pricing`.
- Design docs (`design/galaxia-pricing-copy.md`, implementation spec) still describe **$89/year**, **$7.42/mo**, **$149 lifetime**. Those figures are not on any shipped surface.

No shipped surface shows a price other than **$9.99 per month**.

`[CHANGED]` **`/pricing` presentation only.** Still one monthly SKU at $9.99. No annual plan, yearly toggle, second tier, discount framing, or countdown. The included Vela line is now the section headline: the AI guide is included and never charged per message. The page states that a real chart is free for anyone without an account, and links to `/chart`. Founding-member copy was not live, so none was added. Trial length, entitlements, and billing configuration are unchanged.

`[ADDED]` `PRICING_FREE_CHART_CTA` in `nav-links.ts` so the public-chart link is the same config the rest of marketing uses, not a leftover literal.
