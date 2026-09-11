import Link from "next/link";

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
    // FOUNDER-REVIEW: rewritten (no U+2014).
    body: "Astrology forgot the people you love. Galaxia reads the real charts of your partner, kids, parents, siblings, and friends (not just yours) so you can show up for each bond with more intention.",
    href: "/why-galaxia",
    cta: "Why Galaxia"
  },
  {
    eyebrow: "The edge",
    title: "Generations",
    body: "The slow planets shape a whole generation, not just one person. See the sky your whole family or friend group shares, and where you quietly diverge, from just a birth year.",
    href: "/generations",
    cta: "Explore Generations"
  },
  {
    eyebrow: "Your guide",
    title: "Meet Vela",
    // FOUNDER-REVIEW: rewritten. Shared spaces are unshipped; this describes private Vela only.
    body: "Vela is your AI astrologer and relationship coach, grounded in both real charts and plain good sense. It never invents a placement, and never breaches your privacy.",
    href: "/meet-vela",
    cta: "Meet Vela"
  },
  {
    eyebrow: "Built on trust",
    title: "Private by design",
    body: "Your notes about someone are yours alone, always. No two-way AI chat with children, and every chart comes from real astronomical data: never an AI guess.",
    href: "/security",
    cta: "See how we protect you"
  },
  {
    eyebrow: "Pricing",
    title: "One honest plan",
    body: "No feature tiers, no per-person fees, no upsells: the same everything, for everyone you add. Start with 14 days free.",
    href: "/pricing",
    cta: "View pricing"
  }
];

/**
 * Condensed homepage previews of the five sections that used to live inline
 * on `/` in full — #shift, #generations, #vela, #trust, #pricing (see the
 * removal notes in app/page.tsx). Each card is 2-3 sentences, not the full
 * section, and links out to the standalone page that now carries the whole
 * story.
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
