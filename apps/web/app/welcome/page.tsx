import { CosmicBackground } from "../../components/cosmic-background";
import { FirstRunFlow } from "../../components/first-run-flow";

/**
 * /welcome — first-run orientation.
 *
 * The flow itself lives in components/first-run-flow.tsx so it can be rendered
 * and driven in a jsdom test (vitest.config.ts only collects tests under lib/
 * and components/, and a route file cannot be imported directly). This page is
 * the route and the backdrop, nothing else.
 *
 * Entry points: /start sends anyone whose first run is not settled here, and
 * the constellation offers /welcome?restart=1 to anyone who skipped it.
 */
export default function WelcomePage() {
  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <CosmicBackground />
      <FirstRunFlow />
    </div>
  );
}
