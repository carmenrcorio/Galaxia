import { describe, expect, it, vi } from "vitest";
import {
  BILLING_SUPPORT_EMAIL,
  EMPTY_SNAPSHOT,
  SETTINGS_SUBSCRIPTION_COPY,
  SUBSCRIPTION_FETCH_TIMEOUT_MS,
  deriveSettingsSubscriptionView,
  errorMessageForReason,
  loadSettingsSubscription,
  planDisplayName,
  rowToSnapshot,
  withTimeout,
  type SettingsSubscriptionReader,
  type SettingsSubscriptionSnapshot
} from "./settings-subscription";
import { hasAccess } from "@galaxia/core";

const NOW = new Date("2026-09-14T12:00:00.000Z");
const TRIAL_END = "2026-09-20T12:00:00.000Z";
const PERIOD_END = "2026-10-14T12:00:00.000Z";
const PAST = "2026-09-01T12:00:00.000Z";

function snapshot(partial: Partial<SettingsSubscriptionSnapshot>): SettingsSubscriptionSnapshot {
  return { ...EMPTY_SNAPSHOT, ...partial };
}

describe("RC entitlement id is not this hang", () => {
  it("the dashboard entitlement id lives in @galaxia/core, not in this panel", async () => {
    const { RC_ENTITLEMENT_ID } = await import("@galaxia/core");
    const { RC_ENTITLEMENT_ID: fromWeb } = await import("./revenuecat");
    expect(fromWeb).toBe(RC_ENTITLEMENT_ID);
    expect(RC_ENTITLEMENT_ID.length).toBeGreaterThan(0);
  });
});

describe("planDisplayName", () => {
  it("names a trial when no stored plan exists", () => {
    expect(planDisplayName(null, "trialing")).toBe("Trial");
  });

  it("names the stored monthly plan without guessing", () => {
    expect(planDisplayName("monthly", "active")).toBe("Monthly");
  });

  it("does not invent a plan name when the column is empty", () => {
    expect(planDisplayName(null, "active")).toBe("Your plan");
  });
});

describe("deriveSettingsSubscriptionView uses hasAccess, never a client entitlement check", () => {
  it("trialing user sees days remaining and a trial end date", () => {
    const view = deriveSettingsSubscriptionView(
      snapshot({ status: "trialing", trialEndsAt: TRIAL_END }),
      NOW
    );
    expect(view.entitled).toBe(
      hasAccess({ status: "trialing", trialEndsAt: TRIAL_END, comped: false }, NOW)
    );
    expect(view.planName).toBe("Trial");
    expect(view.trialDaysLeft).toBe(6);
    expect(view.headline).toBe("6 days remaining.");
    expect(view.details.some((line) => line.startsWith("Trial ends "))).toBe(true);
    expect(view.showManageBilling).toBe(true);
    expect(view.showSubscribe).toBe(true);
    expect(view.canCancel).toBe(false);
  });

  it("paid monthly user sees plan name and renewal date", () => {
    const view = deriveSettingsSubscriptionView(
      snapshot({
        status: "active",
        plan: "monthly",
        currentPeriodEnd: PERIOD_END
      }),
      NOW
    );
    expect(view.entitled).toBe(true);
    expect(view.planName).toBe("Monthly");
    expect(view.headline).toMatch(/^Active\. Renews /);
    expect(view.canCancel).toBe(true);
    expect(view.showManageBilling).toBe(true);
    expect(view.manageBillingHref).toContain(BILLING_SUPPORT_EMAIL);
  });

  it("a successful load with a null status is not treated as loading", () => {
    const view = deriveSettingsSubscriptionView(snapshot({ status: null }), NOW);
    expect(view.headline).toBe(SETTINGS_SUBSCRIPTION_COPY.unknown);
    expect(view.headline).not.toMatch(/loading/i);
  });

  it("expired trial follows hasAccess (no access) and names the end", () => {
    const view = deriveSettingsSubscriptionView(
      snapshot({ status: "trialing", trialEndsAt: PAST }),
      NOW
    );
    expect(view.entitled).toBe(false);
    expect(view.headline).toBe(SETTINGS_SUBSCRIPTION_COPY.trialEnded);
    expect(view.trialDaysLeft).toBe(0);
  });

  it("comped copy does not claim a billed plan", () => {
    const view = deriveSettingsSubscriptionView(
      snapshot({ status: "canceled", comped: true }),
      NOW
    );
    expect(view.entitled).toBe(true);
    expect(view.headline).toBe(SETTINGS_SUBSCRIPTION_COPY.comped);
    expect(view.showManageBilling).toBe(false);
    expect(view.canCancel).toBe(false);
  });
});

describe("errorMessageForReason", () => {
  it("names what is known and includes the support address on timeout", () => {
    const msg = errorMessageForReason("timeout");
    expect(msg).toContain(BILLING_SUPPORT_EMAIL);
    expect(msg).toContain("did not receive your account record");
    expect(msg).not.toMatch(/loading/i);
    expect(msg).not.toContain("\u2014");
  });

  it("names what is known and includes the support address on a failed fetch", () => {
    const msg = errorMessageForReason("error");
    expect(msg).toContain(BILLING_SUPPORT_EMAIL);
    expect(msg).toContain("the request failed");
    expect(msg).not.toContain("\u2014");
  });
});

describe("withTimeout / loadSettingsSubscription cannot hang", () => {
  it("rejects a never-resolving promise at the deadline", async () => {
    vi.useFakeTimers();
    try {
      const pending = withTimeout(new Promise(() => {}), 50);
      const expectation = expect(pending).rejects.toMatchObject({ name: "SubscriptionLoadTimeoutError" });
      await vi.advanceTimersByTimeAsync(50);
      await expectation;
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns a timeout result when getUser never resolves", async () => {
    vi.useFakeTimers();
    try {
      const reader: SettingsSubscriptionReader = {
        getUser: () => new Promise(() => {}),
        getProfile: () => new Promise(() => {})
      };
      const pending = loadSettingsSubscription(reader, 80);
      const expectation = pending.then((result) => {
        expect(result).toEqual({ kind: "error", reason: "timeout" });
      });
      await vi.advanceTimersByTimeAsync(80);
      await expectation;
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns a failed-fetch result when the profile query errors", async () => {
    const reader: SettingsSubscriptionReader = {
      getUser: async () => ({ user: { id: "user-1" } }),
      getProfile: async () => ({ data: null, error: { message: "boom" } })
    };
    await expect(loadSettingsSubscription(reader, 500)).resolves.toEqual({
      kind: "error",
      reason: "error"
    });
  });

  it("returns the profile snapshot on success, including a null status", async () => {
    const reader: SettingsSubscriptionReader = {
      getUser: async () => ({ user: { id: "user-1" } }),
      getProfile: async () => ({
        data: {
          subscription_status: "trialing",
          trial_ends_at: TRIAL_END,
          current_period_end: null,
          cancel_at_period_end: false,
          comped: false,
          plan: null
        },
        error: null
      })
    };
    await expect(loadSettingsSubscription(reader, 500)).resolves.toEqual({
      kind: "ready",
      snapshot: {
        status: "trialing",
        trialEndsAt: TRIAL_END,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        comped: false,
        plan: null
      }
    });
  });

  it("the production timeout is two seconds, matching the Settings resolve budget", () => {
    expect(SUBSCRIPTION_FETCH_TIMEOUT_MS).toBe(2000);
  });
});

describe("rowToSnapshot", () => {
  it("treats a missing row as an empty snapshot, not a hang", () => {
    expect(rowToSnapshot(null)).toEqual(EMPTY_SNAPSHOT);
  });
});
