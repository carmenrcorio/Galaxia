import type { Metadata } from "next";
import { CosmicBackground } from "../../components/cosmic-background";
import { CloseSection } from "../../components/marketing/close-section";
import { FeaturesSection } from "../../components/marketing/features-section";
import { MarketingNav } from "../../components/marketing/marketing-nav";
import { RemembranceSection } from "../../components/marketing/remembrance-section";
import { RevealObserver } from "../../components/marketing/reveal-observer";
import { SiteFooter } from "../../components/marketing/site-footer";
import { WhyNotSection } from "../../components/marketing/why-not-section";
import { WhySection } from "../../components/marketing/why-section";

const TITLE = "Why Galaxia · Astrology for the People You Love";
const DESCRIPTION =
  "Astrology forgot the people you love. Galaxia reads the real charts of your partner, kids, parents, siblings, and friends — not just yours — so you can show up for each bond with more intention.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
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

/**
 * Standalone "Why Galaxia" page. Was the homepage's #shift section, plus the
 * Remembrance / "why not a horoscope app" / "how it works" sections that
 * told the rest of the same why-Galaxia story right after it in source order
 * — see the removal notes in app/page.tsx. Grouped here as one page instead
 * of four separate ones so the thesis, the differentiation, and the actual
 * mechanics of the product stay together as a single narrative.
 */
export default function WhyGalaxiaPage() {
  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <CosmicBackground />
      <RevealObserver />
      <MarketingNav />
      <main className="marketing" style={{ position: "relative", zIndex: 2 }}>
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
