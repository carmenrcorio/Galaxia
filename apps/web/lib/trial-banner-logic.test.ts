import { describe, expect, it } from "vitest";
import { trialBannerFromProfile } from "./trial-banner-logic";

describe("trialBannerFromProfile", () => {
  it("hides the banner for comped or non-trialing accounts", () => {
    expect(trialBannerFromProfile({ subscription_status: "active", trial_ends_at: null, comped: false })).toEqual({
      visible: false,
      trialEndsAt: null
    });
    expect(trialBannerFromProfile({ subscription_status: "trialing", trial_ends_at: "2099-01-01T00:00:00Z", comped: true })).toEqual({
      visible: false,
      trialEndsAt: null
    });
  });

  it("shows the banner for an active trial with a future end date", () => {
    const end = "2099-06-15T12:00:00Z";
    expect(trialBannerFromProfile({ subscription_status: "trialing", trial_ends_at: end, comped: false })).toEqual({
      visible: true,
      trialEndsAt: end
    });
  });
});
