import type { Metadata } from "next";
import { CosmicBackground } from "../../components/cosmic-background";
import {
  ForWorkClose,
  ForWorkGenerational,
  ForWorkHero,
  ForWorkHowItWorks,
  ForWorkMoments,
  ForWorkWhatThisIsNot,
} from "../../components/marketing/for-work-sections";
import { MarketingNav } from "../../components/marketing/marketing-nav";
import { RelatedLinks } from "../../components/marketing/related-links";
import { RevealObserver } from "../../components/marketing/reveal-observer";
import { SiteFooter } from "../../components/marketing/site-footer";
import { WebPageJsonLd } from "../../components/marketing/webpage-json-ld";
import { RELATED_LINKS } from "../../lib/nav-links";

// Title keeps the astrology keyword from main (ENGINEERING.md §17: never strip
// astrology from metadata). Visible H1 stays the outcome-only line.
const TITLE = "Galaxia for Work: Relationship Intelligence from Computed Astrology";
const DESCRIPTION =
  "Before the one to one, the negotiation, or the hard feedback, know how this person is wired and what shaped them. Computed astrology from real birth data, written in plain language.";

/**
 * Standalone marketing page for the professional use case. Visible copy is
 * layer one (outcome first). Metadata and JSON-LD are layer two. The app
 * already stores colleague, boss, mentor, and professor as relationship
 * types; this page is the public narrative for that use, with the
 * generational layer as the centrepiece.
 *
 * Canonical in production is https://galaxiamea.com/for-work (relative
 * `/for-work` resolved through `metadataBase`, same pattern as the other
 * feature pages).
 */
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/for-work" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "Galaxia",
    type: "website",
    url: "/for-work",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Galaxia: astrology for understand the people in your life" }]
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Galaxia: astrology for understand the people in your life" }]
  }
};

export default function ForWorkPage() {
  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <WebPageJsonLd path="/for-work" name={TITLE} description={DESCRIPTION} />
      <CosmicBackground />
      <RevealObserver />
      <MarketingNav />
      <main className="marketing" style={{ position: "relative", zIndex: 2 }}>
        <ForWorkHero />
        <ForWorkMoments />
        <ForWorkGenerational />
        <ForWorkWhatThisIsNot />
        <ForWorkHowItWorks />
        <RelatedLinks heading="Keep exploring" links={RELATED_LINKS.forWork} />
        <ForWorkClose />
      </main>
      <SiteFooter />
    </div>
  );
}
