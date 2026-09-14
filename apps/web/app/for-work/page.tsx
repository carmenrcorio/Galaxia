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

// FOUNDER-REVIEW: authored. Title and description for /for-work.
const TITLE = "Understand the people you work with | Galaxia";
const DESCRIPTION =
  "Before the one to one, the negotiation, or the hard feedback, know how this person is wired and what shaped them. Built on real birth data, written in plain language.";

/**
 * Standalone marketing page for the professional use case. Not a former
 * homepage anchor. The app already stores colleague, boss, mentor, and
 * professor as relationship types; this page is the public narrative for
 * that use, with the generational layer as the centrepiece.
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
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Galaxia: astrology for the people you love" }]
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Galaxia: astrology for the people you love" }]
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
