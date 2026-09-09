import type { Metadata } from "next";
import { CosmicBackground } from "../../components/cosmic-background";
import { CloseSection } from "../../components/marketing/close-section";
import { EdgeSection } from "../../components/marketing/edge-section";
import { MarketingNav } from "../../components/marketing/marketing-nav";
import { RevealObserver } from "../../components/marketing/reveal-observer";
import { SectionPageIntro } from "../../components/marketing/section-page-intro";
import { SiteFooter } from "../../components/marketing/site-footer";
import { WebPageJsonLd } from "../../components/marketing/webpage-json-ld";

const TITLE = "Generations — Your Family's Astrology, Together | Galaxia";
const DESCRIPTION =
  "Parents, siblings, grandparents, the people you've lost — Galaxia maps your whole family's charts and shows how generational patterns actually work.";

/**
 * Standalone page for the former homepage `#generations` anchor section
 * (see <EdgeSection>, still rendered on `/` too, id="generations").
 */
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/generations" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "Galaxia",
    type: "website",
    url: "/generations",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Galaxia — astrology for the people you love" }]
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Galaxia — astrology for the people you love" }]
  }
};

export default function GenerationsPage() {
  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <WebPageJsonLd path="/generations" name={TITLE} description={DESCRIPTION} />
      <CosmicBackground />
      <RevealObserver />
      <MarketingNav />
      <main className="marketing" style={{ position: "relative", zIndex: 2 }}>
        <SectionPageIntro title="Generations" lede={DESCRIPTION} />
        <EdgeSection />
        <CloseSection />
      </main>
      <SiteFooter />
    </div>
  );
}
