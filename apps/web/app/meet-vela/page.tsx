import type { Metadata } from "next";
import { CosmicBackground } from "../../components/cosmic-background";
import { CloseSection } from "../../components/marketing/close-section";
import { MarketingNav } from "../../components/marketing/marketing-nav";
import { RevealObserver } from "../../components/marketing/reveal-observer";
import { SectionPageIntro } from "../../components/marketing/section-page-intro";
import { SiteFooter } from "../../components/marketing/site-footer";
import { VelaExampleSection } from "../../components/marketing/vela-example-section";
import { WebPageJsonLd } from "../../components/marketing/webpage-json-ld";

const TITLE = "Meet Vela — Your AI Astrology Guide | Galaxia";
const DESCRIPTION =
  "Vela is Galaxia's AI guide. Ask about your chart, a relationship, or a transit — every answer is grounded in your real computed data, never generic.";

/**
 * Standalone page for the former homepage `#vela` anchor section (see
 * <VelaExampleSection>, still rendered on `/` too).
 */
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/meet-vela" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "Galaxia",
    type: "website",
    url: "/meet-vela",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Galaxia — astrology for the people you love" }]
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Galaxia — astrology for the people you love" }]
  }
};

export default function MeetVelaPage() {
  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <WebPageJsonLd path="/meet-vela" name={TITLE} description={DESCRIPTION} />
      <CosmicBackground />
      <RevealObserver />
      <MarketingNav />
      <main className="marketing" style={{ position: "relative", zIndex: 2 }}>
        <SectionPageIntro title="Meet Vela" lede={DESCRIPTION} />
        <VelaExampleSection />
        <CloseSection />
      </main>
      <SiteFooter />
    </div>
  );
}
