import { describe, expect, it } from "vitest";
import { shouldShowAppTour } from "../src/app-tour";

describe("app tour eligibility", () => {
  it("waits until first-run orientation has been settled", () => {
    expect(
      shouldShowAppTour({
        onboarding_completed_at: null,
        app_tour_seen_at: null,
      })
    ).toBe(false);
  });

  it("shows once after orientation is settled", () => {
    expect(
      shouldShowAppTour({
        onboarding_completed_at: "2026-09-26T20:00:00.000Z",
        app_tour_seen_at: null,
      })
    ).toBe(true);
  });

  it("does not show after either client has marked it seen", () => {
    expect(
      shouldShowAppTour({
        onboarding_completed_at: "2026-09-26T20:00:00.000Z",
        app_tour_seen_at: "2026-09-26T20:05:00.000Z",
      })
    ).toBe(false);
  });

  it("fails closed for a missing profile row", () => {
    expect(shouldShowAppTour(null)).toBe(false);
  });
});
