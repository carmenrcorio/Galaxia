import { describe, expect, it } from "vitest";
import {
  RC_PLAN,
  mapRevenueCatEvent,
  verifyWebhookAuth,
  type RevenueCatEvent
} from "./revenuecat";

const EXP_MS = 1714003200000; // 2024-04-25T00:00:00.000Z
const EXP_ISO = new Date(EXP_MS).toISOString();

function ev(type: string, extra: Partial<RevenueCatEvent> = {}): RevenueCatEvent {
  return { type, app_user_id: "user-1", expiration_at_ms: EXP_MS, ...extra };
}

describe("mapRevenueCatEvent", () => {
  it("grants access on INITIAL_PURCHASE", () => {
    expect(mapRevenueCatEvent(ev("INITIAL_PURCHASE"))).toEqual({
      subscription_status: "active",
      current_period_end: EXP_ISO,
      plan: RC_PLAN,
      cancel_at_period_end: false
    });
  });

  it("keeps access active on RENEWAL and clears cancel_at_period_end", () => {
    const update = mapRevenueCatEvent(ev("RENEWAL"));
    expect(update?.subscription_status).toBe("active");
    expect(update?.cancel_at_period_end).toBe(false);
  });

  it("keeps access active on PRODUCT_CHANGE and clears cancel_at_period_end", () => {
    const update = mapRevenueCatEvent(ev("PRODUCT_CHANGE"));
    expect(update?.subscription_status).toBe("active");
    expect(update?.cancel_at_period_end).toBe(false);
  });

  it("keeps access active on UNCANCELLATION and clears cancel_at_period_end", () => {
    const update = mapRevenueCatEvent(ev("UNCANCELLATION"));
    expect(update?.subscription_status).toBe("active");
    expect(update?.cancel_at_period_end).toBe(false);
  });

  it("keeps the user ACTIVE on CANCELLATION (access continues until period end)", () => {
    // Critical: cancelling auto-renew must not lock the user out immediately.
    // hasAccess (unchanged) is false for `canceled`, so CANCELLATION must stay
    // `active`; only EXPIRATION downgrades. The cancel_at_period_end flag is
    // UI-only so Settings can show "Canceled. Access until …".
    expect(mapRevenueCatEvent(ev("CANCELLATION"))).toEqual({
      subscription_status: "active",
      current_period_end: EXP_ISO,
      plan: RC_PLAN,
      cancel_at_period_end: true
    });
  });

  it("revokes access (canceled) on EXPIRATION and clears cancel_at_period_end", () => {
    const update = mapRevenueCatEvent(ev("EXPIRATION"));
    expect(update?.subscription_status).toBe("canceled");
    expect(update?.cancel_at_period_end).toBe(false);
  });

  it("returns null for events it does not act on", () => {
    expect(mapRevenueCatEvent(ev("BILLING_ISSUE"))).toBeNull();
    expect(mapRevenueCatEvent(ev("TRANSFER"))).toBeNull();
    expect(mapRevenueCatEvent(ev("TEST"))).toBeNull();
  });

  it("returns null for a missing/empty event", () => {
    expect(mapRevenueCatEvent(null)).toBeNull();
    expect(mapRevenueCatEvent(undefined)).toBeNull();
    expect(mapRevenueCatEvent({})).toBeNull();
  });

  it("maps a null/absent expiration to a null current_period_end", () => {
    expect(mapRevenueCatEvent({ type: "INITIAL_PURCHASE", expiration_at_ms: null })?.current_period_end).toBeNull();
    expect(mapRevenueCatEvent({ type: "INITIAL_PURCHASE" })?.current_period_end).toBeNull();
  });
});

describe("verifyWebhookAuth (security-critical)", () => {
  const SECRET = "Bearer super-secret-token-value";

  it("accepts the exact expected value", () => {
    expect(verifyWebhookAuth(SECRET, SECRET)).toBe(true);
  });

  it("rejects a wrong value", () => {
    expect(verifyWebhookAuth("Bearer wrong-token", SECRET)).toBe(false);
  });

  it("rejects a missing/empty provided header", () => {
    expect(verifyWebhookAuth(null, SECRET)).toBe(false);
    expect(verifyWebhookAuth(undefined, SECRET)).toBe(false);
    expect(verifyWebhookAuth("", SECRET)).toBe(false);
  });

  it("fails closed when the expected secret is not configured", () => {
    // An unset REVENUECAT_WEBHOOK_AUTH must never authorize anything.
    expect(verifyWebhookAuth(SECRET, "")).toBe(false);
    expect(verifyWebhookAuth("", "")).toBe(false);
  });

  it("rejects a value of different length (no prefix match)", () => {
    expect(verifyWebhookAuth(SECRET + "x", SECRET)).toBe(false);
    expect(verifyWebhookAuth(SECRET.slice(0, -1), SECRET)).toBe(false);
  });

  it("is case-sensitive", () => {
    expect(verifyWebhookAuth(SECRET.toUpperCase(), SECRET)).toBe(false);
  });
});
