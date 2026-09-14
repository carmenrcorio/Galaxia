import Link from "next/link";
import { HERO_HOW_IT_WORKS, HERO_PRIMARY_CTA, MARKETING_NAV_LOGIN } from "../../lib/nav-links";
import { HeroGraph } from "./hero-graph";
import { QuickChartEntry } from "./quick-chart-entry";

/**
 * Hero — outcome-led copy. The poetic kicker ("The night sky belongs to
 * everyone. Yours doesn't.") moved to WhySection on /why-galaxia so it is
 * not lost. Primary CTA is the public free chart; Log in and See how it
 * works keep their existing destinations. Quick Chart mini-form still sits
 * under the grid as the no-signup try-it entry.
 *
 * Uses .fade-in (a CSS-only keyframe that plays on mount), not the
 * scroll-triggered .reveal + IntersectionObserver pattern used further down
 * the page. Above-the-fold content is already in view on load — there is no
 * "scroll into view" moment to key off, and testing showed .reveal fire
 * timing here is a genuine race (IntersectionObserver's initial callback vs.
 * paint) that occasionally left the hero's own headline and CTA at opacity:0
 * with nothing to trigger it later. That risk is not acceptable for the most
 * important content on the page, so the hero gets the animation that cannot
 * silently fail to fire.
 */
export function Hero() {
  return (
    <header className="hero container">
      <div className="hero-grid">
        <div className="hero-text">
          <span className="eyebrow fade-in">Galaxia · your inner circle</span>
          {/* FOUNDER-REVIEW: "The night sky belongs to everyone. Yours doesn't." moved to WhySection (/why-galaxia). */}
          <h1 className="hero-h1 fade-in fade-in-delay-1">
            {/* FOUNDER-REVIEW: homepage hero headline. */}
            Better understand the people in your life.
          </h1>
          <p className="lede fade-in fade-in-delay-2" style={{ marginTop: 18 }}>
            {/* FOUNDER-REVIEW: homepage hero subheading. */}
            Yes, it uses astrology. No, it will not tell you to avoid Geminis.
          </p>
          <p className="lede fade-in fade-in-delay-2" style={{ marginTop: 14 }}>
            {/* FOUNDER-REVIEW: homepage hero body. */}
            Galaxia builds a real chart for every person in your life, your partner,
            your mother, your difficult colleague, the ones you have lost, and tells you
            in plain language what each of them needs from you (breaks down their nature
            so you can see what few ever will try to).
          </p>
          <div className="hero-actions fade-in fade-in-delay-3">
            <div
              className="hero-cta-primary"
              style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8 }}
            >
              <Link href={HERO_PRIMARY_CTA.href as never} className="btn-primary">{HERO_PRIMARY_CTA.label}</Link>
              <p className="hero-cta-note" style={{ margin: 0, color: "var(--mist2)", fontSize: ".84rem", fontWeight: 400 }}>
                {/* FOUNDER-REVIEW: line under the free-chart CTA. */}
                No card. Works with just a birth date.
              </p>
            </div>
            <Link href={MARKETING_NAV_LOGIN.href as never} className="pill-link hero-login-btn">{MARKETING_NAV_LOGIN.label}</Link>
            <Link href={HERO_HOW_IT_WORKS.href as never} className="hero-scroll-cue">
              <span>{HERO_HOW_IT_WORKS.label}</span>
              <ArrowDown />
            </Link>
          </div>
        </div>
        <div className="constellation fade-in fade-in-delay-2">
          <HeroGraph />
        </div>
      </div>
      <QuickChartEntry />
    </header>
  );
}

function ArrowDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M7 1v10.5M2.5 8 7 12.5 11.5 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
