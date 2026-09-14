import Link from "next/link";
import { FEATURE_TEASER_LINKS } from "../../lib/nav-links";

type Teaser = {
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  cta: string;
};

const TEASERS: Teaser[] = [
  {
    eyebrow: "The shift",
    title: "Why Galaxia",
    // FOUNDER-REVIEW: outcome first, feature second.
    body: "You find out what they need from you. Why Galaxia reads their real charts, not a horoscope about you.",
    href: FEATURE_TEASER_LINKS[0].href,
    cta: FEATURE_TEASER_LINKS[0].label
  },
  {
    eyebrow: "The edge",
    title: "Generations",
    // FOUNDER-REVIEW: outcome first, feature second.
    body: "You see the sky a whole family or friend group shares, and where one person quietly diverges. Generations does that from a birth year.",
    href: FEATURE_TEASER_LINKS[1].href,
    cta: FEATURE_TEASER_LINKS[1].label
  },
  {
    eyebrow: "Your guide",
    title: "Meet Vela",
    // FOUNDER-REVIEW: outcome first, feature second. Shared spaces are unshipped; this describes private Vela only.
    body: "You get something to actually do, grounded in both charts. Vela is the guide that never invents a placement and never breaches your privacy.",
    href: FEATURE_TEASER_LINKS[2].href,
    cta: FEATURE_TEASER_LINKS[2].label
  },
  {
    eyebrow: "Built on trust",
    title: "Private by design",
    // FOUNDER-REVIEW: outcome first, feature second.
    body: "What you write about someone stays yours, and a child never sits in a two-way chat. Private by design is real astronomical data, never an AI guess.",
    href: FEATURE_TEASER_LINKS[3].href,
    cta: FEATURE_TEASER_LINKS[3].label
  },
  {
    eyebrow: "Pricing",
    title: "One honest plan",
    // FOUNDER-REVIEW: outcome first, feature second.
    body: "You add everyone without paying per person. One honest plan is the same everything, 14 days free, no feature tiers.",
    href: FEATURE_TEASER_LINKS[4].href,
    cta: FEATURE_TEASER_LINKS[4].label
  }
];

/**
 * Condensed homepage previews of the five sections that used to live inline
 * on `/` in full — #shift, #generations, #vela, #trust, #pricing (see the
 * removal notes in app/page.tsx). Each card is two sentences (outcome, then
 * feature) and links out to the standalone page that now carries the whole
 * story. Destinations are unchanged.
 */
export function FeatureTeasers() {
  return (
    <section className="container teaser-section" id="explore">
      <div className="teaser-head reveal">
        <span className="eyebrow">Explore Galaxia</span>
        <h2>One home, five ways in.</h2>
      </div>
      <div className="teaser-grid">
        {TEASERS.map((t) => (
          <Link key={t.href} href={t.href as never} className="teaser-card glass-card reveal">
            <span className="eyebrow">{t.eyebrow}</span>
            <h3>{t.title}</h3>
            <p>{t.body}</p>
            <span className="teaser-cta">{t.cta} →</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
