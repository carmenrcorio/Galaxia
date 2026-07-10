import type { ReactNode } from "react";
import { AppNav } from "../../components/app-nav";
import { CosmicBackground } from "../../components/cosmic-background";
import { TrialBanner } from "../../components/trial-banner";

/**
 * App shell layout. The nav itself lives in components/app-nav.tsx (a
 * client component — see that file for the mobile-nav bug it fixes and why
 * it's structured the way it is).
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <CosmicBackground />
      <AppNav />

      {/* Content sits above CosmicBackground (z-index 2) */}
      <div style={{ position: "relative", zIndex: 2 }}>
        <TrialBanner />
        {children}
      </div>
    </div>
  );
}
