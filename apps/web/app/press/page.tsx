import type { Metadata } from "next";
import { GALAXIA_HELP_EMAIL } from "@galaxia/core";
import { CosmicBackground } from "../../components/cosmic-background";
import { CloseSection } from "../../components/marketing/close-section";
import { MarketingNav } from "../../components/marketing/marketing-nav";
import { PressKitSection } from "../../components/marketing/press-kit-section";
import { RelatedLinks } from "../../components/marketing/related-links";
import { RevealObserver } from "../../components/marketing/reveal-observer";
import { SectionPageIntro } from "../../components/marketing/section-page-intro";
import { SiteFooter } from "../../components/marketing/site-footer";
import { WebPageJsonLd } from "../../components/marketing/webpage-json-ld";
import { RELATED_LINKS } from "../../lib/nav-links";

const TITLE = "Press: Galaxia, Relationship Intelligence from Computed Astrology";
const DESCRIPTION =
  `Press materials for Galaxia. Relationship intelligence powered by computed natal charts and synastry. Guidance, not fortune telling. Contact ${GALAXIA_HELP_EMAIL}.`;
const LEDE =
  "Galaxia helps people understand the ones they already love, and show up for each bond with more intention.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/press" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "Galaxia",
    type: "website",
    url: "/press",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Galaxia: astrology for understand the people in your life" }]
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Galaxia: astrology for understand the people in your life" }]
  }
};

export default function PressPage() {
  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <WebPageJsonLd path="/press" name={TITLE} description={DESCRIPTION} />
      <CosmicBackground />
      <RevealObserver />
      <MarketingNav />
      <main className="marketing" style={{ position: "relative", zIndex: 2 }}>
        <SectionPageIntro title="Press" lede={LEDE} />
        <PressKitSection />
        <RelatedLinks heading="Keep exploring" links={RELATED_LINKS.press} />
        <CloseSection />
      </main>
      <SiteFooter />
    </div>
  );
}
