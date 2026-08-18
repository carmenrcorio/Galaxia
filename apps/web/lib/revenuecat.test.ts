import { describe, expect, it } from "vitest";
import {
  RC_BACKEND_CODE,
  RC_ENTITLEMENT_ID,
  RC_ERROR_CODE,
  RC_PLAN,
  isCheckoutSetupRejection,
  mapRevenueCatEvent,
  parseRcBackendFailure,
  purchaseErrorCopy,
  rcBackendErrorCode,
  rcKeyKind,
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

describe("rcKeyKind", () => {
  it("reads RevenueCat Billing mode off the prefix", () => {
    expect(rcKeyKind("rcb_sb_abc123")).toBe("revenuecat-billing-sandbox");
    expect(rcKeyKind("rcb_abc123")).toBe("revenuecat-billing-production");
  });

  it("names the other engines the SDK accepts, which configure but are not ours", () => {
    // These pass the SDK's key validation, so they fail later at the backend
    // rather than locally — the case that is otherwise invisible.
    expect(rcKeyKind("strp_abc123")).toBe("stripe-billing");
    expect(rcKeyKind("pdl_abc123")).toBe("paddle-billing");
    expect(rcKeyKind("test_abc123")).toBe("test-store");
  });

  it("names a wrong-product key the SDK rejects outright", () => {
    expect(rcKeyKind("appl_abc123")).toBe("mobile-sdk-key");
    expect(rcKeyKind("goog_abc123")).toBe("mobile-sdk-key");
    expect(rcKeyKind("amzn_abc123")).toBe("mobile-sdk-key");
    expect(rcKeyKind("sk_abc123")).toBe("secret-key");
    expect(rcKeyKind("nonsense")).toBe("unrecognized");
  });

  it("reports a missing key as missing, not as a kind of key", () => {
    expect(rcKeyKind("")).toBe("missing");
    expect(rcKeyKind(null)).toBe("missing");
    expect(rcKeyKind(undefined)).toBe("missing");
  });

  it("does not mistake a sandbox key for a production one", () => {
    // The production branch is a prefix of the sandbox one, so order matters.
    expect(rcKeyKind("rcb_sb_x")).not.toBe("revenuecat-billing-production");
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

/**
 * The two shapes the same checkout rejection arrives in. Both are built the way
 * `purchases-js` builds them: the HTTP layer throws with the endpoint, status
 * and body in `underlyingErrorMessage` and the backend code on `extra`, and the
 * checkout modal's error handler then rebuilds the error, remapping the code
 * from 16 to 2 and dropping `extra` while keeping the message intact.
 */
const REJECTION_BODY = '{"code":8142,"message":"Checkout session could not be created."}';
const REJECTION_UNDERLYING = `Request: postCheckoutStart. Status code: 422. Body: ${REJECTION_BODY}.`;

const DIRECT_REJECTION = {
  errorCode: RC_ERROR_CODE.unknownBackend,
  backendErrorCode: RC_BACKEND_CODE.checkoutSessionRejected,
  underlyingErrorMessage: REJECTION_UNDERLYING
};

const REWRAPPED_REJECTION = {
  errorCode: RC_ERROR_CODE.storeProblem,
  backendErrorCode: null,
  underlyingErrorMessage: REJECTION_UNDERLYING
};

describe("parseRcBackendFailure", () => {
  it("reads the endpoint, status and body code the SDK put in the message", () => {
    expect(parseRcBackendFailure(REJECTION_UNDERLYING)).toEqual({
      request: "postCheckoutStart",
      httpStatus: 422,
      backendErrorCode: 8142
    });
  });

  it("returns nulls rather than guesses when the message is absent or unshaped", () => {
    for (const input of [null, undefined, "", "something else entirely"]) {
      expect(parseRcBackendFailure(input)).toEqual({
        request: null,
        httpStatus: null,
        backendErrorCode: null
      });
    }
  });

  it("takes only a top-level body code, not a nested one", () => {
    const nested = 'Request: postCheckoutStart. Status code: 422. Body: {"error":{"code":9999}}.';
    expect(parseRcBackendFailure(nested).backendErrorCode).toBeNull();
  });

  it("still finds the code in a body that is not parseable JSON", () => {
    const truncated = 'Request: postCheckoutStart. Status code: 422. Body: {"code":8142,"message":"trunc';
    expect(parseRcBackendFailure(truncated).backendErrorCode).toBe(8142);
  });

  it("parses a non-checkout backend failure without inventing a checkout one", () => {
    const offerings = 'Request: getOfferings. Status code: 500. Body: {"code":7110}.';
    expect(parseRcBackendFailure(offerings)).toEqual({
      request: "getOfferings",
      httpStatus: 500,
      backendErrorCode: 7110
    });
  });
});

describe("rcBackendErrorCode", () => {
  it("prefers extra when the SDK kept it", () => {
    expect(rcBackendErrorCode(DIRECT_REJECTION)).toBe(8142);
  });

  it("recovers the code from the message body when extra was dropped", () => {
    // The modal path: this is the only place 8142 still exists on that route.
    expect(rcBackendErrorCode(REWRAPPED_REJECTION)).toBe(8142);
  });

  it("is null when the error carries no backend code at all", () => {
    expect(rcBackendErrorCode({ errorCode: RC_ERROR_CODE.network })).toBeNull();
    expect(rcBackendErrorCode({})).toBeNull();
  });
});

describe("isCheckoutSetupRejection", () => {
  it("detects the rejection on both SDK paths, which disagree on the error code", () => {
    // 16 direct, 2 through the modal. Keying off errorCode would miss one.
    expect(isCheckoutSetupRejection(DIRECT_REJECTION)).toBe(true);
    expect(isCheckoutSetupRejection(REWRAPPED_REJECTION)).toBe(true);
  });

  it("detects a checkout-opening endpoint refusing with 422 even under a different code", () => {
    // The 8142 number is what we have observed, not a guarantee. A call that
    // opens checkout answering 422 is a refusal to process whatever code it
    // carries.
    expect(
      isCheckoutSetupRejection({
        errorCode: RC_ERROR_CODE.unknownBackend,
        underlyingErrorMessage:
          'Request: postCheckoutPrepare. Status code: 422. Body: {"code":8399}.'
      })
    ).toBe(true);
  });

  it("does not call a failure after the card was entered a setup rejection", () => {
    // postCheckoutComplete runs once the user has already typed card details,
    // so "we couldn't start checkout" would be a false statement about it.
    expect(
      isCheckoutSetupRejection({
        errorCode: RC_ERROR_CODE.unknownBackend,
        underlyingErrorMessage:
          'Request: postCheckoutComplete. Status code: 422. Body: {"code":8399}.'
      })
    ).toBe(false);
  });

  it("does not claim a setup rejection for a transient or unrelated failure", () => {
    expect(
      isCheckoutSetupRejection({
        errorCode: RC_ERROR_CODE.unknownBackend,
        underlyingErrorMessage: 'Request: postCheckoutStart. Status code: 503. Body: {"code":7110}.'
      })
    ).toBe(false);
    expect(
      isCheckoutSetupRejection({
        errorCode: RC_ERROR_CODE.unknownBackend,
        underlyingErrorMessage: 'Request: getOfferings. Status code: 422. Body: {"code":7226}.'
      })
    ).toBe(false);
    expect(isCheckoutSetupRejection({ errorCode: RC_ERROR_CODE.network })).toBe(false);
    expect(isCheckoutSetupRejection({})).toBe(false);
  });
});

describe("purchaseErrorCopy for a checkout setup rejection", () => {
  it("does not put a permanent setup failure in the generic retry bucket", () => {
    const generic = purchaseErrorCopy(RC_ERROR_CODE.unknownBackend);
    for (const failure of [DIRECT_REJECTION, REWRAPPED_REJECTION]) {
      const copy = purchaseErrorCopy(failure);
      expect(copy).toBeTruthy();
      expect(copy).not.toBe(generic);
      expect(copy).toContain("start checkout");
    }
  });

  it("does not promise the user that trying again will work", () => {
    const copy = purchaseErrorCopy(DIRECT_REJECTION)!.toLowerCase();
    expect(copy).not.toMatch(/please try again\b/);
    expect(copy).toContain("rather than trying again now");
  });

  it("names no cause it cannot verify and nothing about the user's money", () => {
    // ENGINEERING.md §12. We know checkout did not open. We do not know why.
    const copy = purchaseErrorCopy(DIRECT_REJECTION)!.toLowerCase();
    for (const fabrication of ["declin", "card", "charged", "charge", "bank", "payment method", "expired"]) {
      expect(copy).not.toContain(fabrication);
    }
  });

  it("leaks nothing internal and no em dash", () => {
    // ENGINEERING.md §7, plus the house rule against em dashes in authored copy.
    const copy = purchaseErrorCopy(DIRECT_REJECTION)!;
    expect(copy).not.toMatch(/\d/);
    expect(copy).not.toContain("—");
    for (const internal of ["revenuecat", "stripe", "sandbox", "checkout/start", "422", "8142"]) {
      expect(copy.toLowerCase()).not.toContain(internal);
    }
  });

  it("still says nothing when the user closed the checkout themselves", () => {
    // A cancel outranks the rejection signal even if both are somehow present.
    expect(purchaseErrorCopy({ ...DIRECT_REJECTION, errorCode: RC_ERROR_CODE.userCancelled })).toBeNull();
  });

  it("never overwrites a claim about the user's own money with the rejection copy", () => {
    // A payment in flight, or an existing subscription, is a more specific and
    // more consequential truth than "checkout did not open".
    for (const code of [RC_ERROR_CODE.paymentPending, RC_ERROR_CODE.alreadyPurchased]) {
      expect(purchaseErrorCopy({ ...DIRECT_REJECTION, errorCode: code })).toBe(purchaseErrorCopy(code));
    }
  });

  it("accepts a bare error code, so callers with only a code still work", () => {
    expect(purchaseErrorCopy(RC_ERROR_CODE.userCancelled)).toBeNull();
    expect(purchaseErrorCopy({ errorCode: RC_ERROR_CODE.network })).toBe(
      purchaseErrorCopy(RC_ERROR_CODE.network)
    );
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
