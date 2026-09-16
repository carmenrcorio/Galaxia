import Link from "next/link";
import { HERO_HOW_IT_WORKS } from "../../lib/nav-links";
import { HeroGraph } from "./hero-graph";
import { QuickChartEntry } from "./quick-chart-entry";

/**
 * Hero — outcome-led copy. The poetic kicker ("The night sky belongs to
 * everyone. Yours doesn't.") moved to WhySection on /why-galaxia so it is
 * not lost. Premise (chart-for-each-person + anti-horoscope defense) lives
 * in the copy block so a visitor can read it before scrolling. The only
 * in-hero CTA is "See how it works", which scrolls to #how. Log in and
 * Sign up live in the top nav. The free-chart gold button is gone; Quick
 * Chart mini-form still sits under the grid as the no-signup try-it entry.
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
          <span className="eyebrow fade-in">Your life. Your people. Your galaxy.</span>
          <h1 className="hero-h1 fade-in fade-in-delay-1">
            {/* FOUNDER-REVIEW: homepage hero headline. Gold italic on the terminal beat, matching close-h. */}
            Better understand the people <em className="hero-h1__accent">in your life</em>
          </h1>
          <div className="hero-copy fade-in fade-in-delay-2">
            <p className="lede">
              {/* FOUNDER-REVIEW: homepage hero subheading. */}
              Build a real chart for everyone who matters: your loved ones, your colleagues, even the ones you've lost, and learn who they are at their core.
            </p>
            <p className="lede">
              {/* FOUNDER-REVIEW: homepage hero value proposition. Same brightness as the lede above; no dimming class. */}
              Yes, it's real astrology. We won't tell you to avoid Geminis, we'll help you actually understand one.
            </p>
          </div>
          <div className="hero-cta-stack fade-in fade-in-delay-3">
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
    <svg width="20" height="20" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M7 1v10.5M2.5 8 7 12.5 11.5 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
