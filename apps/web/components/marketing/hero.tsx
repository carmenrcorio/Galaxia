import Link from "next/link";
import { HERO_HOW_IT_WORKS, MARKETING_NAV_LOGIN, MARKETING_NAV_SIGNUP } from "../../lib/nav-links";
import { HeroGraph } from "./hero-graph";
import { QuickChartEntry } from "./quick-chart-entry";

/**
 * Hero — restructured per spec: the poetic line is shrunk to a kicker
 * (was the full clamp(3rem,8.4vw,6.6rem) headline; a line that size filled
 * the mobile viewport before a visitor reached anything that says what the
 * product actually is) and a plain-language subheadline now carries the H1.
 * Existing CTAs stay (signup + see how it works). Quick Chart mini-form sits
 * under the grid as the primary try-it entry (no signup); submit reveals
 * Sun/Moon inline via NatalSignReveal — no navigation off the marketing page.
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
          <p className="hero-kicker fade-in fade-in-delay-1">
            The night sky belongs to everyone. <em>Yours</em> doesn't.
          </p>
          <h1 className="hero-h1 fade-in fade-in-delay-1">
            Understand <em>the people you love</em>. Then show up for them.
          </h1>
          <p className="lede fade-in fade-in-delay-2" style={{ marginTop: 18 }}>
            {/* FOUNDER-REVIEW: layer-one ATF. Outcome first; astrology is not the first word. */}
            Galaxia is relationship intelligence for the small circle that actually shapes your days:
            partner, kids, parents, siblings, friends. Not a horoscope. Not for swiping on strangers.
          </p>
          <div className="hero-actions fade-in fade-in-delay-3">
            <Link href={MARKETING_NAV_SIGNUP.href as never} className="btn-primary">{MARKETING_NAV_SIGNUP.label}</Link>
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