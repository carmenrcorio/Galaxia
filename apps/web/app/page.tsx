import type { Metadata } from "next";
import { CosmicBackground } from "../components/cosmic-background";
import { CloseSection } from "../components/marketing/close-section";
import { EdgeSection } from "../components/marketing/edge-section";
import { FaqSection } from "../components/marketing/faq-section";
import { FeaturesSection } from "../components/marketing/features-section";
import { Hero } from "../components/marketing/hero";
import { MarketingNav } from "../components/marketing/marketing-nav";
import { PricingSection } from "../components/marketing/pricing-section";
import { RemembranceSection } from "../components/marketing/remembrance-section";
import { RevealObserver } from "../components/marketing/reveal-observer";
import { SiteFooter } from "../components/marketing/site-footer";
import { TrustSection } from "../components/marketing/trust-section";
import { VelaExampleSection } from "../components/marketing/vela-example-section";
import { WhyNotSection } from "../components/marketing/why-not-section";
import { WhySection } from "../components/marketing/why-section";
import { publicEnv } from "../lib/env";

const TITLE = "Galaxia — Astrology for the People You Love";
const DESCRIPTION =
  "Galaxia reads the real birth charts of your inner circle — partner, kids, parents, siblings, friends — so you can show up for each bond with more intention. Not your horoscope.";

// Same prod fallback as `metadataBase` in app/layout.tsx / `SITE_URL` in
// app/sitemap.ts — the `SoftwareApplication` JSON-LD below needs an
// absolute `url`, which `metadataBase` doesn't help with (that only resolves
// relative Metadata API fields like `openGraph.images`, not raw JSON-LD).
const SITE_URL = publicEnv.siteUrl || "https://galaxia-three.vercel.app";

// The product-level structured data — describes Galaxia itself, once, so it
// lives on `/` only. Every standalone page split out of a homepage section
// (see app/why-galaxia, /generations, /meet-vela, /security, /pricing and
// components/marketing/webpage-json-ld.tsx) gets its own `WebPage` schema
// instead of repeating this.
const SOFTWARE_APPLICATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Galaxia",
  applicationCategory: "LifestyleApplication",
  operatingSystem: "Web, iOS, Android",
  description: DESCRIPTION,
  url: SITE_URL,
  offers: [
    { "@type": "Offer", price: "9.99", priceCurrency: "USD", name: "Monthly" },
    { "@type": "Offer", price: "89", priceCurrency: "USD", name: "Yearly" }
  ]
};

/**
 * Page-specific metadata for `/` — the link every launch post (Reddit, etc.)
 * actually points at. Defining `openGraph`/`twitter` here fully replaces the
 * generic defaults from `app/layout.tsx` (Next merges metadata per
 * top-level key, not deep-per-field), so this restates the same branded
 * `og-image.png` rather than relying on inheritance, while giving the tab
 * title and crawler preview real, page-specific copy instead of the bare
 * "Galaxia" every other route falls back to.
 */
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "Galaxia",
    type: "website",
    url: "/",
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
 * Marketing landing page. Was previously a single dangerouslySetInnerHTML
 * raw HTML string + injected <script> — see CHANGELOG.md for the full
 * rebuild notes (Phase 0 inventory, Phase 1 JSX-conversion parity, Phase 2
 * restructure). Every section below is a real component; there is no
 * dangerouslySetInnerHTML anywhere on this page anymore.
 *
 * Conversion order: Hero (with Quick Chart mini-form + inline natal sign reveal)
 * → The Edge → The shift → Remembrance → why-not-a-horoscope-app → How it works
 * → Vela → Trust → Pricing → FAQ → Close.
 */
export default function HomePage() {
  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      {/* eslint-disable-next-line react/no-danger -- trusted, statically-built JSON, not user input */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SOFTWARE_APPLICATION_JSON_LD) }} />
      <CosmicBackground />
      <RevealObserver />
      <MarketingNav />
      <main className="marketing" style={{ position: "relative", zIndex: 2 }}>
        <Hero />
        <EdgeSection />
        <WhySection />
        <RemembranceSection />
        <WhyNotSection />
        <FeaturesSection />
        <VelaExampleSection />
        <TrustSection />
        <PricingSection />
        <FaqSection />
        <CloseSection />
      </main>
      <SiteFooter />
    </div>
  );
}
