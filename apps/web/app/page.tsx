import type { Metadata } from "next";
import { JsonLd, type JsonLdObject } from "../components/seo/json-ld";
import { CosmicBackground } from "../components/cosmic-background";
import { CloseSection } from "../components/marketing/close-section";
import { FaqSection } from "../components/marketing/faq-section";
import { FeatureTeasers } from "../components/marketing/feature-teasers";
import { HashRedirect } from "../components/marketing/hash-redirect";
import { Hero } from "../components/marketing/hero";
import { MarketingNav } from "../components/marketing/marketing-nav";
import { RevealObserver } from "../components/marketing/reveal-observer";
import { SiteFooter } from "../components/marketing/site-footer";

const TITLE = "Galaxia — Astrology for the People You Love";
const DESCRIPTION =
  "Galaxia reads the real birth charts of your inner circle — partner, kids, parents, siblings, friends — so you can show up for each bond with more intention. Not your horoscope.";

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
  alternates: {
    canonical: "/"
  },
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
 * Marketing landing page — a concise hub, not the whole story. Used to carry
 * every section in full (The shift, The edge, Remembrance, why-not-a-
 * horoscope-app, How it works, Vela, Trust, Pricing, FAQ, Close — see
 * CHANGELOG.md for that rebuild's history). Those five feature sections
 * (#shift, #generations, #vela, #trust, #pricing) now each have their own
 * standalone page — app/why-galaxia, app/generations, app/meet-vela,
 * app/security, app/pricing — and this page only carries a condensed,
 * 2-3-sentence preview of each (FeatureTeasers) linking out to the real
 * thing. `HashRedirect` sends a bookmarked `/#generations`-style link on to
 * wherever that content now lives, since a hash fragment never reaches the
 * server for a normal route-based redirect to catch.
 *
 * Kept in full here: Hero (headline + primary signup CTA), the teaser grid,
 * FAQ (already short-form, not a duplicate of a standalone page), the final
 * CTA, and the footer. The SoftwareApplication schema below stays
 * homepage-only, describing the product once rather than per page — each
 * standalone page has its own WebPage schema instead (see
 * components/marketing/webpage-json-ld.tsx).
 */
/**
 * Organization + SoftwareApplication JSON-LD — homepage only. Gives search
 * engines a structured description of what Galaxia is and who publishes it,
 * separate from the human-facing copy above. `HomePage` is a plain server
 * component (no "use client"), so this renders straight into the initial
 * server HTML rather than being injected after hydration.
 */
const SOFTWARE_APPLICATION_JSON_LD: JsonLdObject = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Galaxia",
  applicationCategory: "LifestyleApplication",
  operatingSystem: "iOS, Android, Web",
  url: "https://galaxiamea.com",
  description:
    "Relationship intelligence powered by computed astrology. Real natal charts, synastry readings, and an AI guide — for you and the people in your life.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free trial, no credit card required"
  },
  publisher: {
    "@type": "Organization",
    name: "Galaxia",
    url: "https://galaxiamea.com",
    contactPoint: {
      "@type": "ContactPoint",
      email: "help@galaxiamea.com",
      contactType: "customer support"
    }
  }
};

export default function HomePage() {
  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <JsonLd data={SOFTWARE_APPLICATION_JSON_LD} />
      <CosmicBackground />
      <RevealObserver />
      <HashRedirect />
      <MarketingNav />
      <main className="marketing" style={{ position: "relative", zIndex: 2 }}>
        <Hero />
        <FeatureTeasers />
        <FaqSection />
        <CloseSection />
      </main>
      <SiteFooter />
    </div>
  );
}
