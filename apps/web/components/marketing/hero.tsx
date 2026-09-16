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
 * First-screen text (eyebrow, H1, ledes) is visible in the SSR HTML with no
 * .reveal and no .fade-in. Both of those classes start at opacity:0 —
 * .reveal until RevealObserver hydrates, .fade-in for the animation-delay
 * via fill-mode:both — and lab LCP then lands on the tiny nav wordmark
 * instead of the headline. The CTA and constellation card keep CSS-only
 * .fade-in; they are not the LCP node. Scroll .reveal stays further down.
 */
export function Hero() {
  return (
    <header className="hero container">
      <div className="hero-grid">
        <div className="hero-text">
          <span className="eyebrow">Your Life. Your People. Your Galaxy.</span>
          <h1 className="hero-h1">
            Better understand the people <em className="hero-h1__accent">in your life</em>
          </h1>
          <div className="hero-copy">
            <p className="lede">
              Build a real chart for everyone who matters: your loved ones, your colleagues, even the ones you've lost, and learn who they are at their core.
            </p>
            <p className="lede">
              Yes, it's real astrology. We won't tell you to avoid Geminis. We'll help you actually understand one.
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
