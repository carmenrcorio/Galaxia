import type { Metadata } from "next";
import { CosmicBackground } from "../../components/cosmic-background";
import { CloseSection } from "../../components/marketing/close-section";
import { MarketingNav } from "../../components/marketing/marketing-nav";
import { RevealObserver } from "../../components/marketing/reveal-observer";
import { SiteFooter } from "../../components/marketing/site-footer";
import { VelaExampleSection } from "../../components/marketing/vela-example-section";

const TITLE = "Meet Vela · Your AI Astrologer & Relationship Coach · Galaxia";
const DESCRIPTION =
  "Vela is your AI astrologer and relationship coach — an astrologer who already knows both charts, and a coach who gives you something to actually do. It never invents a placement, never takes a side, and never breaches your privacy.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
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

/**
 * Standalone "Meet Vela" page — was the homepage's #vela section. See the
 * removal notes in app/page.tsx.
 */
export default function MeetVelaPage() {
  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <CosmicBackground />
      <RevealObserver />
      <MarketingNav />
      <main className="marketing" style={{ position: "relative", zIndex: 2 }}>
        <VelaExampleSection />
        <CloseSection />
      </main>
      <SiteFooter />
    </div>
  );
}
