import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const home = readFileSync(
  resolve(__dirname, "../../app/(app)/(tabs)/home.tsx"),
  "utf8"
);
const tour = readFileSync(
  resolve(__dirname, "../components/app-tour.tsx"),
  "utf8"
);

describe("mobile app tour wiring", () => {
  it("reads and writes the cross-platform profile timestamp", () => {
    expect(home).toContain("onboarding_completed_at, app_tour_seen_at");
    expect(home).toContain("shouldShowAppTour(profile)");
    expect(home).toContain(
      "update({ app_tour_seen_at: new Date().toISOString() })"
    );
    expect(home).toContain(
      '<AppTour visible={showAppTour} onSeen={markAppTourSeen} />'
    );
  });

  it("uses the shared copy in an accessible native modal", () => {
    expect(tour).toContain('import { APP_TOUR_COPY } from "@galaxia/core"');
    expect(tour).toContain("accessibilityViewIsModal");
    expect(tour).toContain("onRequestClose={() => void settle()}");
    expect(tour).toContain("APP_TOUR_COPY.finish");
    expect(tour).toContain("APP_TOUR_COPY.skip");
  });
});
