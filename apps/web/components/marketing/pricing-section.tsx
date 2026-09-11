import Link from "next/link";

/** Pricing: one monthly card, matching the paywall. */
export function PricingSection() {
  return (
    <section className="container" id="pricing">
      <div className="price-wrap">
        <div className="faq-head reveal">
          {/* FOUNDER-REVIEW: authored - pricing headline + lede. */}
          <span className="eyebrow" style={{ justifyContent: "center" }}>Pricing</span>
          <h2 style={{ marginTop: 16 }}>One honest plan.</h2>
          <p className="lede" style={{ margin: "16px auto 0" }}>
            No feature tiers. No per-person fees. No upsells.
          </p>
        </div>
        <div className="price-cards reveal">
          <div className="pcard glass-card">
            {/* FOUNDER-REVIEW: rewritten. This is the only SKU the paywall sells. */}
            <div className="pcard-name">Monthly</div>
            <div className="pcard-price">$9.99 <span>/month</span></div>
            <div className="pcard-sub">Billed monthly · 14 days free</div>
            <Link href="/signup" className="btn-primary" style={{ marginTop: 18, display: "inline-block" }}>Start 14 days free</Link>
          </div>
        </div>
        <p className="price-no-cap reveal">✦ No per-person cap — your grandmother shouldn't cost extra.</p>
        <div className="incl glass-card reveal">
          <div className="incl-row"><span className="incl-star">✦</span><p><b>Real charts.</b> Computed from precise astronomical data — placements, houses, angles, aspects, to the degree. Never guessed by an AI.</p></div>
          <div className="incl-row"><span className="incl-star">✦</span><p><b>Vela.</b> An astrologer and relationship coach who knows both charts and gives you something to actually do.</p></div>
          <div className="incl-row"><span className="incl-star">✦</span><p><b>The generational layer.</b> See the sky your whole family was born under. Works from just a birth year.</p></div>
          <div className="incl-row"><span className="incl-star">✦</span><p><b>Private by design.</b> Your notes about someone are yours alone. Always. No two-way AI chat about children.</p></div>
        </div>
        <p className="price-reassure reveal">Cancel in one click, any time.</p>
      </div>
    </section>
  );
}
