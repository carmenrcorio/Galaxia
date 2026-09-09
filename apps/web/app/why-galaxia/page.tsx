import type { Metadata } from "next";
import { CosmicBackground } from "../../components/cosmic-background";
import { CloseSection } from "../../components/marketing/close-section";
import { MarketingNav } from "../../components/marketing/marketing-nav";
import { RevealObserver } from "../../components/marketing/reveal-observer";
import { SectionPageIntro } from "../../components/marketing/section-page-intro";
import { SiteFooter } from "../../components/marketing/site-footer";
import { WebPageJsonLd } from "../../components/marketing/webpage-json-ld";
import { WhySection } from "../../components/marketing/why-section";

const TITLE = "Why Galaxia — Relationship Intelligence, Not Horoscopes";
const DESCRIPTION =
  "Galaxia uses computed astrology — real planetary positions, not sun-sign guesses — to map how you actually connect with the people in your life.";

/**
 * Standalone page for the former homepage `#shift` anchor section (see
 * <WhySection>, still rendered on `/` too). Same component, same copy — this
 * just gives it a real <h1>, its own metadata, and a URL search can actually
 * rank, instead of only being reachable as a same-page jump target.
 */
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/why-galaxia" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "Galaxia",
    type: "website",
    url: "/why-galaxia",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Galaxia — astrology for the people you love" }]
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Galaxia — astrology for the people you love" }]
  }
};

export default function WhyGalaxiaPage() {
  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <WebPageJsonLd path="/why-galaxia" name={TITLE} description={DESCRIPTION} />
      <CosmicBackground />
      <RevealObserver />
      <MarketingNav />
      <main className="marketing" style={{ position: "relative", zIndex: 2 }}>
        <SectionPageIntro title="Why Galaxia" lede={DESCRIPTION} />
        <WhySection />
        <CloseSection />
      </main>
      <SiteFooter />
    </div>
  );
}
