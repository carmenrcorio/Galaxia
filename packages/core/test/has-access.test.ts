import { describe, expect, it } from "vitest";
import { hasAccess } from "../src/index";

const NOW = new Date("2026-07-24T12:00:00.000Z");
const PAST = "2026-07-10T12:00:00.000Z";
const FUTURE = "2026-08-01T12:00:00.000Z";

describe("hasAccess", () => {
  it("grants access when comped even if billing is canceled", () => {
    expect(
      hasAccess({ status: "canceled", trialEndsAt: PAST, comped: true }, NOW)
    ).toBe(true);
  });

  it("grants access when comped even if trial is expired", () => {
    expect(
      hasAccess({ status: "trialing", trialEndsAt: PAST, comped: true }, NOW)
    ).toBe(true);
  });

  it("denies access for non-comped canceled billing", () => {
    expect(
      hasAccess({ status: "canceled", trialEndsAt: PAST, comped: false }, NOW)
    ).toBe(false);
    expect(hasAccess({ status: "canceled", trialEndsAt: PAST }, NOW)).toBe(false);
  });

  it("still grants on active / lifetime / live trial without comped", () => {
    expect(hasAccess({ status: "active", comped: false }, NOW)).toBe(true);
    expect(hasAccess({ status: "lifetime", comped: false }, NOW)).toBe(true);
    expect(
      hasAccess({ status: "trialing", trialEndsAt: FUTURE, comped: false }, NOW)
    ).toBe(true);
  });

  it("treats comped strictly (only boolean true)", () => {
    expect(hasAccess({ status: "canceled", comped: null }, NOW)).toBe(false);
    expect(hasAccess({ status: "canceled", comped: false }, NOW)).toBe(false);
  });
});
