import { lstatSync, readFileSync, readlinkSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  profileAllowsAccess,
  VELA_ENTITLEMENT_REQUIRED_ERROR
} from "../src/has-access";

const NOW = new Date("2026-07-24T12:00:00.000Z");
const PAST = "2026-07-10T12:00:00.000Z";
const FUTURE = "2026-08-01T12:00:00.000Z";

const EDGE_PATH = resolve(__dirname, "../../../supabase/functions/vela-chat/index.ts");

describe("profileAllowsAccess (vela-chat fail-closed)", () => {
  it("denies when profile row is missing (fail closed)", () => {
    expect(profileAllowsAccess(null, NOW)).toBe(false);
    expect(profileAllowsAccess(undefined, NOW)).toBe(false);
  });

  it("denies unentitled canceled / expired trial", () => {
    expect(
      profileAllowsAccess(
        { subscription_status: "canceled", trial_ends_at: PAST, comped: false },
        NOW
      )
    ).toBe(false);
    expect(
      profileAllowsAccess(
        { subscription_status: "trialing", trial_ends_at: PAST, comped: false },
        NOW
      )
    ).toBe(false);
  });

  it("allows comped, active, lifetime, and live trial", () => {
    expect(
      profileAllowsAccess(
        { subscription_status: "canceled", trial_ends_at: PAST, comped: true },
        NOW
      )
    ).toBe(true);
    expect(
      profileAllowsAccess({ subscription_status: "active", trial_ends_at: null, comped: false }, NOW)
    ).toBe(true);
    expect(
      profileAllowsAccess({ subscription_status: "lifetime", trial_ends_at: null, comped: false }, NOW)
    ).toBe(true);
    expect(
      profileAllowsAccess(
        { subscription_status: "trialing", trial_ends_at: FUTURE, comped: false },
        NOW
      )
    ).toBe(true);
  });
});

describe("vela-chat edge entitlement wiring", () => {
  const src = readFileSync(EDGE_PATH, "utf8");

  it("imports hasAccess helpers from shared core module (no inline fork)", () => {
    expect(src).toContain('from "./has-access.ts"');
    expect(src).toContain("profileAllowsAccess");
    expect(src).toContain("VELA_ENTITLEMENT_REQUIRED_ERROR");
    expect(src).not.toMatch(/function\s+hasAccess\s*\(/);
    expect(src).not.toMatch(/function\s+profileAllowsAccess\s*\(/);
  });

  it("vela-chat/has-access.ts is a symlink to packages/core/src/has-access.ts", () => {
    const edgeHasAccess = resolve(__dirname, "../../../supabase/functions/vela-chat/has-access.ts");
    const coreHasAccess = resolve(__dirname, "../src/has-access.ts");
    expect(lstatSync(edgeHasAccess).isSymbolicLink()).toBe(true);
    expect(realpathSync(edgeHasAccess)).toBe(realpathSync(coreHasAccess));
    const link = readlinkSync(edgeHasAccess);
    expect(link.replace(/\\/g, "/")).toMatch(/packages\/core\/src\/has-access\.ts$/);
  });

  it("returns 403 with the shared error string before thread/Anthropic work", () => {
    expect(src).toContain("jsonResponse(403, { error: VELA_ENTITLEMENT_REQUIRED_ERROR })");
    expect(VELA_ENTITLEMENT_REQUIRED_ERROR.length).toBeGreaterThan(10);

    const entitlementIdx = src.indexOf("profileAllowsAccess(profile)");
    const parseIdx = src.indexOf("const payload = (await req.json())");
    const threadIdx = src.indexOf("from(\"threads\")");
    const anthropicIdx = src.indexOf("api.anthropic.com");
    expect(entitlementIdx).toBeGreaterThan(-1);
    expect(parseIdx).toBeGreaterThan(entitlementIdx);
    expect(threadIdx).toBeGreaterThan(entitlementIdx);
    expect(anthropicIdx).toBeGreaterThan(entitlementIdx);
  });

  it("does not weaken the shared-mode minor gate", () => {
    expect(src).toContain('mode === "shared" && people.some((p) => isMinorForSafety(p))');
    expect(src).toContain("Shared spaces are turned off when a minor is involved");
  });
});
