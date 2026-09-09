import type { Metadata } from "next";
import { CosmicBackground } from "../../components/cosmic-background";
import { CloseSection } from "../../components/marketing/close-section";
import { MarketingNav } from "../../components/marketing/marketing-nav";
import { PricingSection } from "../../components/marketing/pricing-section";
import { RevealObserver } from "../../components/marketing/reveal-observer";
import { SiteFooter } from "../../components/marketing/site-footer";

const TITLE = "Pricing · One Honest Plan · Galaxia";
const DESCRIPTION =
  "One honest plan. No feature tiers, no per-person fees, no upsells. $9.99/month or $89/year (save 26%), with 14 days free.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "Galaxia",
    type: "website",
    url: "/pricing",
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
 * Standalone "Pricing" page — was the homepage's #pricing section. See the
 * removal notes in app/page.tsx.
 */
export default function PricingPage() {
  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <CosmicBackground />
      <RevealObserver />
      <MarketingNav />
      <main className="marketing" style={{ position: "relative", zIndex: 2 }}>
        <PricingSection />
        <CloseSection />
      </main>
      <SiteFooter />
    </div>
  );
}
