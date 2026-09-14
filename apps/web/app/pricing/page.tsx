import type { Metadata } from "next";
import { CosmicBackground } from "../../components/cosmic-background";
import { CloseSection } from "../../components/marketing/close-section";
import { MarketingNav } from "../../components/marketing/marketing-nav";
import { PricingSection } from "../../components/marketing/pricing-section";
import { RelatedLinks } from "../../components/marketing/related-links";
import { RevealObserver } from "../../components/marketing/reveal-observer";
import { SectionPageIntro } from "../../components/marketing/section-page-intro";
import { SiteFooter } from "../../components/marketing/site-footer";
import { WebPageJsonLd } from "../../components/marketing/webpage-json-ld";
import { RELATED_LINKS } from "../../lib/nav-links";

// FOUNDER-REVIEW: rewritten (no U+2014).
const TITLE = "Galaxia Pricing";
// FOUNDER-REVIEW: rewritten. One monthly price. Vela included. Public chart is free without an account.
const DESCRIPTION =
  "One plan. $9.99 per month. Vela, the AI guide, is included and never charged per message. Without an account, anyone can run a real chart.";

/**
 * Standalone page for the former homepage `#pricing` anchor section (see
 * <PricingSection>). The homepage itself no longer renders this section in
 * full — see the removal notes in app/page.tsx — so this is the only
 * indexable pricing URL for the product.
 */
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "Galaxia",
    type: "website",
    url: "/pricing",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Galaxia: astrology for the people you love" }]
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Galaxia: astrology for the people you love" }]
  }
};

export default function PricingPage() {
  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <WebPageJsonLd path="/pricing" name={TITLE} description={DESCRIPTION} />
      <CosmicBackground />
      <RevealObserver />
      <MarketingNav />
      <main className="marketing" style={{ position: "relative", zIndex: 2 }}>
        {/* FOUNDER-REVIEW: rewritten. One honest tier. */}
        <SectionPageIntro title="One Honest Plan" lede={DESCRIPTION} />
        <PricingSection />
        <RelatedLinks heading="Keep exploring" links={RELATED_LINKS.pricing} />
        <CloseSection />
      </main>
      <SiteFooter />
    </div>
  );
}
