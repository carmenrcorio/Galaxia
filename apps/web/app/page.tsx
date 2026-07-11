import { CosmicBackground } from "../components/cosmic-background";
import { CloseSection } from "../components/marketing/close-section";
import { EdgeSection } from "../components/marketing/edge-section";
import { FaqSection } from "../components/marketing/faq-section";
import { FeaturesSection } from "../components/marketing/features-section";
import { Hero } from "../components/marketing/hero";
import { MarketingNav } from "../components/marketing/marketing-nav";
import { PricingSection } from "../components/marketing/pricing-section";
import { RevealObserver } from "../components/marketing/reveal-observer";
import { SiteFooter } from "../components/marketing/site-footer";
import { TrustSection } from "../components/marketing/trust-section";
import { VelaExampleSection } from "../components/marketing/vela-example-section";
import { WhySection } from "../components/marketing/why-section";

/**
 * Marketing landing page. Was previously a single dangerouslySetInnerHTML
 * raw HTML string + injected <script> — see CHANGELOG.md for the full
 * rebuild notes (Phase 0 inventory, Phase 1 JSX-conversion parity, Phase 2
 * restructure). Every section below is a real component; there is no
 * dangerouslySetInnerHTML anywhere on this page anymore.
 */
export default function HomePage() {
  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <CosmicBackground />
      <RevealObserver />
      <MarketingNav />
      <main style={{ position: "relative", zIndex: 2 }}>
        <Hero />
        <WhySection />
        <FeaturesSection />
        <EdgeSection />
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
