import Link from "next/link";

/** Pricing — two cards, real prices. The no-per-person-cap line now lives inside the card cluster, not buried in a separate list below. */
export function PricingSection() {
  return (
    <section className="container" id="pricing">
      <div className="price-wrap">
        <div className="faq-head reveal">
          <span className="eyebrow" style={{ justifyContent: "center" }}>Pricing</span>
          <h2 style={{ marginTop: 16 }}>One price. Everyone you love.</h2>
          <p className="lede" style={{ margin: "16px auto 0" }}>
            No tiers, no add-ons, no limit on how many people you can add. Fourteen days free to try all of it.
          </p>
        </div>
        <div className="price-cards reveal">
          <div className="pcard glass-card pcard--best">
            <div className="pcard-badge">Best value</div>
            <div className="pcard-name">Yearly</div>
            <div className="pcard-price">$89 <span>/year</span></div>
            <div className="pcard-sub">$7.42 a month · save 26%</div>
            <Link href="/signup" className="btn-primary" style={{ marginTop: 18, display: "inline-block" }}>Start 14 days free</Link>
          </div>
          <div className="pcard glass-card">
            <div className="pcard-name">Monthly</div>
            <div className="pcard-price">$9.99 <span>/month</span></div>
            <div className="pcard-sub">&nbsp;</div>
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
