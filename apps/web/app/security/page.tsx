import type { Metadata } from "next";
import { CosmicBackground } from "../../components/cosmic-background";
import { CloseSection } from "../../components/marketing/close-section";
import { MarketingNav } from "../../components/marketing/marketing-nav";
import { RelatedLinks } from "../../components/marketing/related-links";
import { RevealObserver } from "../../components/marketing/reveal-observer";
import { SectionPageIntro } from "../../components/marketing/section-page-intro";
import { SiteFooter } from "../../components/marketing/site-footer";
import { TrustSection } from "../../components/marketing/trust-section";
import { WebPageJsonLd } from "../../components/marketing/webpage-json-ld";

// FOUNDER-REVIEW: rewritten (no U+2014).
const TITLE = "Your Data and Privacy on Galaxia";
const DESCRIPTION =
  "Galaxia stores birth data about you and your family. Here's exactly how we handle it, who can see it, and what we'll never do with it.";

/**
 * Standalone page for the former homepage `#trust` anchor section (see
 * <TrustSection>). The homepage itself no longer renders this section in
 * full — see the removal notes in app/page.tsx. Not a replacement for
 * /privacy (the full legal Privacy Policy, app/privacy/page.tsx) — this is
 * the plain-language trust pitch; it links out to /privacy for the legal
 * text via <TrustSection>'s existing copy.
 */
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/security" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "Galaxia",
    type: "website",
    url: "/security",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Galaxia: astrology for the people you love" }]
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Galaxia: astrology for the people you love" }]
  }
};

export default function SecurityPage() {
  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <WebPageJsonLd path="/security" name={TITLE} description={DESCRIPTION} />
      <CosmicBackground />
      <RevealObserver />
      <MarketingNav />
      <main className="marketing" style={{ position: "relative", zIndex: 2 }}>
        <SectionPageIntro title="Your Data Is Yours" lede={DESCRIPTION} />
        <TrustSection />
        <RelatedLinks
          heading="Keep exploring"
          links={[
            { href: "/privacy", label: "Read our full privacy policy" },
            { href: "/pricing", label: "See pricing" },
          ]}
        />
        <CloseSection />
      </main>
      <SiteFooter />
    </div>
  );
}
