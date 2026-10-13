import type { ReactNode } from "react";
import { AppNav } from "../../components/app-nav";
import { CosmicBackground } from "../../components/cosmic-background-lazy";
import { TimezoneSync } from "../../components/timezone-sync";
import { TrialBanner } from "../../components/trial-banner";
import { getTrialBannerState } from "../../lib/trial-banner-state";

/**
 * App shell layout. The nav itself lives in components/app-nav.tsx (a
 * client component — see that file for the mobile-nav bug it fixes and why
 * it's structured the way it is).
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const trialBanner = await getTrialBannerState();
  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <CosmicBackground />
      <AppNav />

      {/* Content sits above CosmicBackground (z-index 2) */}
      <div style={{ position: "relative", zIndex: 2 }}>
        <TrialBanner initial={trialBanner} />
        <TimezoneSync />
        {children}
      </div>
    </div>
  );
}
