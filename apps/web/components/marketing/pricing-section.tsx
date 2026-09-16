import Link from "next/link";
import { MARKETING_NAV_SIGNUP, PRICING_FREE_CHART_CTA } from "../../lib/nav-links";

/**
 * Pricing: one monthly card, matching the paywall. Annual/lifetime SKUs are
 * not offered here even if they exist in RevenueCat. Founding-member copy is
 * not live (`NEXT_PUBLIC_FOUNDING_ENABLED` is unread by this page).
 */
export function PricingSection() {
  return (
    <section className="container" id="pricing">
      <div className="price-wrap">
        <div className="price-cards">
          <div className="pcard glass-card">
                        <div className="pcard-name">Monthly</div>
                        <div className="pcard-price">
              $9.99 <span>per month</span>
            </div>
                        <div className="pcard-sub">Billed monthly. 14 days free.</div>
            <Link
              href={MARKETING_NAV_SIGNUP.href as never}
              className="btn-primary"
              style={{ marginTop: 18, display: "inline-block" }}
            >
              {MARKETING_NAV_SIGNUP.label}
            </Link>
          </div>
        </div>
                <p className="price-no-cap">✦ No per-person cap: your grandmother shouldn't cost extra.</p>
        <div className="incl glass-card">
          <div className="incl-headline">
                        <h2>Vela is included. Never charged per message.</h2>
                        <p>The AI guide is part of this plan. There is no per-message fee, ever.</p>
          </div>
                    <div className="incl-row">
            <span className="incl-star">✦</span>
            <p>
              <b>Real charts.</b> Computed from precise astronomical data: placements, houses, angles,
              aspects, to the degree. Never guessed by an AI.
            </p>
          </div>
          <div className="incl-row">
            <span className="incl-star">✦</span>
            <p>
              <b>The generational layer.</b> See the sky your whole family was born under. Works from
              just a birth year.
            </p>
          </div>
          <div className="incl-row">
            <span className="incl-star">✦</span>
            <p>
              <b>Private by design.</b> Your notes about someone are yours alone. Always. No two-way
              AI chat about children.
            </p>
          </div>
        </div>
        <p className="price-free reveal">
                    Without an account, anyone can run a real chart. No signup required.{" "}
          <Link href={PRICING_FREE_CHART_CTA.href as never}>{PRICING_FREE_CHART_CTA.label}</Link>
        </p>
                <p className="price-reassure reveal">Cancel in one click, any time.</p>
      </div>
    </section>
  );
}
