import type { Metadata } from "next";
import { CosmicBackground } from "../../components/cosmic-background";
import { CloseSection } from "../../components/marketing/close-section";
import { FeaturesSection } from "../../components/marketing/features-section";
import { MarketingNav } from "../../components/marketing/marketing-nav";
import { RemembranceSection } from "../../components/marketing/remembrance-section";
import { RevealObserver } from "../../components/marketing/reveal-observer";
import { SectionPageIntro } from "../../components/marketing/section-page-intro";
import { SiteFooter } from "../../components/marketing/site-footer";
import { WebPageJsonLd } from "../../components/marketing/webpage-json-ld";
import { WhyNotSection } from "../../components/marketing/why-not-section";
import { WhySection } from "../../components/marketing/why-section";

const TITLE = "Why Galaxia — Relationship Intelligence, Not Horoscopes";
const DESCRIPTION =
  "Galaxia uses computed astrology — real planetary positions, not sun-sign guesses — to map how you actually connect with the people in your life.";

/**
 * Standalone page for the former homepage `#shift` anchor section (see
 * <WhySection>). The homepage itself no longer renders this section in
 * full — see the removal notes in app/page.tsx — so this real <h1>, its
 * own metadata, and this URL are the only way to reach and rank this copy.
 *
 * Also carries <RemembranceSection>, <WhyNotSection>, and <FeaturesSection>
 * — the three homepage sections that sat right after #shift in source
 * order (Why → Remembrance → why-not-a-horoscope-app → How it works) but
 * never had their own anchor or standalone route. Removing them from the
 * homepage without giving them a home would delete that content from the
 * site entirely, so they stay grouped with the section they originally
 * followed: the full "why Galaxia" narrative — thesis, remembrance,
 * differentiation, and mechanics — in one page.
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
        <RemembranceSection />
        <WhyNotSection />
        <FeaturesSection />
        <CloseSection />
      </main>
      <SiteFooter />
    </div>
  );
}
