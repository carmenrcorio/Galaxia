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
    eyebrow: "Method",
    title: "How we compute this",
    // FOUNDER-REVIEW
    body:
      "Planet positions come from real ephemeris data, not guesswork. Orbs and aspects follow fixed rules, and chart readings are written in advance and approved before they ship. Vela is AI that only names what the chart actually shows.",
    href: FEATURE_TEASER_LINKS[0].href,
    cta: FEATURE_TEASER_LINKS[0].label
  },
  {
    eyebrow: "The shift",
    title: "Why Galaxia",
    body: "You find out what they need from you. Why Galaxia reads their real charts, not a horoscope about you.",
    href: FEATURE_TEASER_LINKS[1].href,
    cta: FEATURE_TEASER_LINKS[1].label
  },
  {
    eyebrow: "The edge",
    title: "Generations",
    body: "You see the sky a whole family or friend group shares, and where one person quietly diverges. Generations does that from a birth year.",
    href: FEATURE_TEASER_LINKS[2].href,
    cta: FEATURE_TEASER_LINKS[2].label
  },
  {
    eyebrow: "Your guide",
    title: "Meet Vela",
    body: "You get something to actually do, grounded in both charts. Vela is the guide that never invents a placement and never breaches your privacy.",
    href: FEATURE_TEASER_LINKS[3].href,
    cta: FEATURE_TEASER_LINKS[3].label
  },
  {
    eyebrow: "Built on trust",
    title: "Private by design",
    body: "What you write about someone stays yours, and a child never sits in a two-way chat. Private by design is real astronomical data, never an AI guess.",
    href: FEATURE_TEASER_LINKS[4].href,
    cta: FEATURE_TEASER_LINKS[4].label
  },
  {
    eyebrow: "Pricing",
    title: "One honest plan",
    body: "You add everyone without paying per person. One honest plan is the same everything, 14 days free, no feature tiers.",
    href: FEATURE_TEASER_LINKS[5].href,
    cta: FEATURE_TEASER_LINKS[5].label
  }
];

/**
 * Condensed homepage previews of the six marketing surfaces: methodology first,
 * then the five sections that used to live inline on `/` (#shift,
 * #generations, #vela, #trust, #pricing; see app/page.tsx). Each card is
 * two or three plain sentences and links out to the standalone page that
 * carries the whole story.
 */
export function FeatureTeasers() {
  return (
    <section className="container teaser-section" id="explore">
      <div className="teaser-head reveal">
        <span className="eyebrow">Explore Galaxia</span>
        <h2>One home, six ways in.</h2>
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
