import type { Metadata } from "next";
import { CosmicBackground } from "../../components/cosmic-background";
import { CloseSection } from "../../components/marketing/close-section";
import { MarketingNav } from "../../components/marketing/marketing-nav";
import { PricingSection } from "../../components/marketing/pricing-section";
import { RevealObserver } from "../../components/marketing/reveal-observer";
import { SectionPageIntro } from "../../components/marketing/section-page-intro";
import { SiteFooter } from "../../components/marketing/site-footer";
import { WebPageJsonLd } from "../../components/marketing/webpage-json-ld";

const TITLE = "Pricing — Galaxia";
const DESCRIPTION =
  "One honest plan. See what Galaxia costs, what's included, and what you can do free — no hidden fees, no per-question charges, no subscription traps.";

/**
 * Standalone page for the former homepage `#pricing` anchor section (see
 * <PricingSection>, still rendered on `/` too). Previously `/pricing` had
 * no real route — see the (now stale) comment in app/sitemap.ts — so this
 * is the first indexable pricing URL for the product.
 */
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/pricing" },
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

export default function PricingPage() {
  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <WebPageJsonLd path="/pricing" name={TITLE} description={DESCRIPTION} />
      <CosmicBackground />
      <RevealObserver />
      <MarketingNav />
      <main className="marketing" style={{ position: "relative", zIndex: 2 }}>
        <SectionPageIntro title="One Honest Plan" lede={DESCRIPTION} />
        <PricingSection />
        <CloseSection />
      </main>
      <SiteFooter />
    </div>
  );
}
