import type { Metadata } from "next";
import { CosmicBackground } from "../../components/cosmic-background";
import { CloseSection } from "../../components/marketing/close-section";
import { MarketingNav } from "../../components/marketing/marketing-nav";
import { RevealObserver } from "../../components/marketing/reveal-observer";
import { SiteFooter } from "../../components/marketing/site-footer";
import { TrustSection } from "../../components/marketing/trust-section";

const TITLE = "Security & Privacy · Private by Design · Galaxia";
const DESCRIPTION =
  "The people in Galaxia are the ones you love most. Your notes are yours alone, there's no two-way AI chat with children, and every chart comes from real astronomical data — never AI-guessed.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "Galaxia",
    type: "website",
    url: "/security",
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
 * Standalone "Security" page — was the homepage's #trust section ("Built on
 * trust" / private-by-design). See the removal notes in app/page.tsx. Not
 * in the primary nav (per spec, the nav is Why Galaxia / Generations / Meet
 * Vela / Blog / Pricing) but linked from the homepage teaser grid, the
 * footer, and the sitemap.
 */
export default function SecurityPage() {
  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <CosmicBackground />
      <RevealObserver />
      <MarketingNav />
      <main className="marketing" style={{ position: "relative", zIndex: 2 }}>
        <TrustSection />
        <CloseSection />
      </main>
      <SiteFooter />
    </div>
  );
}
