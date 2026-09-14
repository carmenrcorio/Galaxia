import type { Metadata } from "next";
import { CosmicBackground } from "../../components/cosmic-background";
import { CloseSection } from "../../components/marketing/close-section";
import { ForWorkSection } from "../../components/marketing/for-work-section";
import { MarketingNav } from "../../components/marketing/marketing-nav";
import { RelatedLinks } from "../../components/marketing/related-links";
import { RevealObserver } from "../../components/marketing/reveal-observer";
import { SectionPageIntro } from "../../components/marketing/section-page-intro";
import { SiteFooter } from "../../components/marketing/site-footer";
import { WebPageJsonLd } from "../../components/marketing/webpage-json-ld";
import { RELATED_LINKS } from "../../lib/nav-links";

// FOUNDER-REVIEW: layer-two metadata. Visible copy on this page is layer one.
const TITLE = "Galaxia for Work: Relationship Intelligence from Computed Astrology";
const DESCRIPTION =
  "For coaches, managers, and anyone whose work is other people. Computed astrology as a map of how someone is built, not a prediction of what will happen.";
const LEDE =
  "Show up for the people your work depends on. Galaxia is relationship intelligence for coaches, managers, and anyone whose job is tending other people.";

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
        <SectionPageIntro title="Galaxia for work" lede={LEDE} />
        <ForWorkSection />
        <RelatedLinks heading="Keep exploring" links={RELATED_LINKS.forWork} />
        <CloseSection />
      </main>
      <SiteFooter />
    </div>
  );
}
