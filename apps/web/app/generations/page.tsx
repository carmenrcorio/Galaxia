import type { Metadata } from "next";
import { CosmicBackground } from "../../components/cosmic-background";
import { CloseSection } from "../../components/marketing/close-section";
import { EdgeSection } from "../../components/marketing/edge-section";
import { MarketingNav } from "../../components/marketing/marketing-nav";
import { RevealObserver } from "../../components/marketing/reveal-observer";
import { SiteFooter } from "../../components/marketing/site-footer";

const TITLE = "Generations · The Sky Your Whole Family Was Born Under · Galaxia";
const DESCRIPTION =
  "The slow planets shape a whole generation, not just one person. See the sky your whole family or friend group shares — and where you quietly diverge — from just a birth year.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
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

/**
 * Standalone "Generations" page — was the homepage's #generations section
 * (the generational layer, Galaxia's differentiator). See the removal notes
 * in app/page.tsx.
 */
export default function GenerationsPage() {
  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <CosmicBackground />
      <RevealObserver />
      <MarketingNav />
      <main className="marketing" style={{ position: "relative", zIndex: 2 }}>
        <EdgeSection />
        <CloseSection />
      </main>
      <SiteFooter />
    </div>
  );
}
