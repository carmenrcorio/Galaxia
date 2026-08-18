import { describe, expect, it } from "vitest";
import {
  RC_ENTITLEMENT_ID,
  RC_ERROR_CODE,
  RC_PLAN,
  mapRevenueCatEvent,
  purchaseErrorCopy,
  rcKeyMode,
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

  it("never includes comped in any mapped update (webhook must not touch it)", () => {
    const types = [
      "INITIAL_PURCHASE",
      "RENEWAL",
      "PRODUCT_CHANGE",
      "UNCANCELLATION",
      "CANCELLATION",
      "EXPIRATION"
    ];
    for (const type of types) {
      const update = mapRevenueCatEvent(ev(type));
      expect(update).not.toBeNull();
      expect(Object.keys(update!).sort()).toEqual([
        "cancel_at_period_end",
        "current_period_end",
        "plan",
        "subscription_status"
      ]);
      expect(update).not.toHaveProperty("comped");
    }
  });
});

describe("comped survives billing expiration (resolution contract)", () => {
  // Mirrors the webhook write + hasAccess read: EXPIRATION cancels billing
  // columns only; hasAccess still grants when comped remains true on the row.
  it("comped + EXPIRATION-mapped status still has access; non-comped does not", async () => {
    const { hasAccess } = await import("@galaxia/core");
    const expiration = mapRevenueCatEvent(ev("EXPIRATION"));
    expect(expiration?.subscription_status).toBe("canceled");
    expect(expiration).not.toHaveProperty("comped");

    expect(
      hasAccess({
        status: expiration!.subscription_status,
        trialEndsAt: null,
        comped: true
      })
    ).toBe(true);
    expect(
      hasAccess({
        status: expiration!.subscription_status,
        trialEndsAt: null,
        comped: false
      })
    ).toBe(false);
  });
});

describe("RC_ENTITLEMENT_ID", () => {
  it("is the dashboard entitlement id, exactly", () => {
    // Case- and space-sensitive: the post-purchase entitlements.active[...]
    // lookup in the paywall only matches on an exact string.
    expect(RC_ENTITLEMENT_ID).toBe("GalaxiaMea App Unlimited");
  });
});

describe("rcKeyMode", () => {
  it("reads the mode off the key prefix", () => {
    expect(rcKeyMode("rcb_sb_abc123")).toBe("sandbox");
    expect(rcKeyMode("rcb_abc123")).toBe("production");
  });

  it("flags a key that is not a Web Billing key at all", () => {
    // e.g. a mobile SDK key or a secret key pasted in by mistake.
    expect(rcKeyMode("appl_abc123")).toBe("unrecognized");
    expect(rcKeyMode("goog_abc123")).toBe("unrecognized");
    expect(rcKeyMode("sk_abc123")).toBe("unrecognized");
  });

  it("reports a missing key as missing, not as a mode", () => {
    expect(rcKeyMode("")).toBe("missing");
    expect(rcKeyMode(null)).toBe("missing");
    expect(rcKeyMode(undefined)).toBe("missing");
  });
});

describe("purchaseErrorCopy", () => {
  it("says nothing when the user closed the checkout themselves", () => {
    expect(purchaseErrorCopy(RC_ERROR_CODE.userCancelled)).toBeNull();
  });

  it("does not call a pending payment a failure or ask for a second payment", () => {
    const copy = purchaseErrorCopy(RC_ERROR_CODE.paymentPending);
    expect(copy).toBeTruthy();
    expect(copy!.toLowerCase()).toContain("no need to pay again");
  });

  it("does not tell the user to retry a misconfiguration they cannot fix", () => {
    for (const code of [
      RC_ERROR_CODE.invalidCredentials,
      RC_ERROR_CODE.configuration,
      RC_ERROR_CODE.unsupported,
      RC_ERROR_CODE.invalidAppUserId
    ]) {
      expect(purchaseErrorCopy(code)).toContain("Payments aren't set up correctly");
    }
  });

  it("gives a plain retry message for backend/unknown failures (incl. code 16)", () => {
    expect(purchaseErrorCopy(RC_ERROR_CODE.unknownBackend)).toContain("try again");
    expect(purchaseErrorCopy(999)).toContain("try again");
    expect(purchaseErrorCopy(null)).toContain("try again");
    expect(purchaseErrorCopy(undefined)).toContain("try again");
  });

  it("never claims whether the user was charged when we do not know", () => {
    // ENGINEERING.md §12: no confident wrong answer about someone's money.
    for (const code of [RC_ERROR_CODE.unknownBackend, RC_ERROR_CODE.storeProblem, 999]) {
      expect(purchaseErrorCopy(code)!.toLowerCase()).not.toContain("charged");
    }
  });

  it("leaks no error code, key or internal detail into user copy", () => {
    // ENGINEERING.md §7: nothing internal reaches the user.
    const codes = [...Object.values(RC_ERROR_CODE), 0, 999];
    for (const code of codes) {
      const copy = purchaseErrorCopy(code);
      if (!copy) continue;
      expect(copy).not.toMatch(/\d/);
      expect(copy.toLowerCase()).not.toContain("revenuecat");
      expect(copy.toLowerCase()).not.toContain("rcb_");
      expect(copy.toLowerCase()).not.toContain("stripe");
      expect(copy.toLowerCase()).not.toContain("sandbox");
    }
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
