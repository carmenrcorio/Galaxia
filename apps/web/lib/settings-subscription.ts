import { hasAccess, trialDaysRemaining } from "@galaxia/core";

/**
 * Settings subscription panel: read-only view over `profiles` billing columns.
 *
 * Source of truth is `profiles.subscription_status` (written only by the
 * RevenueCat webhook). This module never talks to the RevenueCat client SDK
 * and never writes entitlement columns. `@galaxia/core` `hasAccess` is the
 * one access decision; trial remaining uses `trialDaysRemaining`.
 */

export const SUBSCRIPTION_FETCH_TIMEOUT_MS = 2000;

export const BILLING_SUPPORT_EMAIL = "help@galaxiamea.com";

// FOUNDER-REVIEW: Settings subscription panel copy.
export const SETTINGS_SUBSCRIPTION_COPY = {
  supportEmail: BILLING_SUPPORT_EMAIL,
  manageBillingLabel: "Manage billing",
  manageBillingHref: `mailto:${BILLING_SUPPORT_EMAIL}?subject=Manage%20billing`,
  cancelLabel: "Cancel subscription",
  subscribeLabel: "Subscribe",
  checking: "Checking your subscription…",
  timeout:
    "We could not load your subscription details in time. What we know: this page did not receive your account record. Email help@galaxiamea.com and we will look it up.",
    error:
    "We could not load your subscription details. What we know: the request failed. Email help@galaxiamea.com and we will look it up.",
    unknown:
    "We do not have a subscription record for this account yet. Email help@galaxiamea.com if this looks wrong.",
  planFallback: "Your plan",
  planTrial: "Trial",
  planMonthly: "Monthly",
  planLifetime: "Lifetime",
  comped: "Permanent access. This account is complimentary: you are not billed.",
  trialNoDate: "You are on a trial.",
  trialEnded: "Your trial has ended.",
  activeNoDate: "Active.",
  pastDue: "Past due. Update your payment method to keep access.",
  canceledNoDate: "Your subscription has ended.",
  lifetime: "Lifetime access.",
  uncancelHint: "Changed your mind? Email support and we can help turn renewal back on."
} as const;

export class SubscriptionLoadTimeoutError extends Error {
  constructor() {
    super("timeout");
    this.name = "SubscriptionLoadTimeoutError";
  }
}

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => {
      reject(new SubscriptionLoadTimeoutError());
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(id);
        resolve(value);
      },
      (err) => {
        clearTimeout(id);
        reject(err);
      }
    );
  });
}

export interface SubscriptionProfileRow {
  subscription_status: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  comped: boolean | null;
  plan: string | null;
}

export interface SettingsSubscriptionSnapshot {
  status: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  comped: boolean;
  plan: string | null;
}

export interface SettingsSubscriptionReader {
  getUser: () => Promise<{ user: { id: string } | null }>;
  getProfile: (userId: string) => Promise<{
    data: SubscriptionProfileRow | null;
    error: { message: string } | null;
  }>;
}

export type SettingsSubscriptionLoadResult =
  | { kind: "ready"; snapshot: SettingsSubscriptionSnapshot }
  | { kind: "error"; reason: "timeout" | "error" };

export const EMPTY_SNAPSHOT: SettingsSubscriptionSnapshot = {
  status: null,
  trialEndsAt: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  comped: false,
  plan: null
};

export function rowToSnapshot(
  row: SubscriptionProfileRow | null | undefined
): SettingsSubscriptionSnapshot {
  if (!row) return { ...EMPTY_SNAPSHOT };
  return {
    status: row.subscription_status ?? null,
    trialEndsAt: row.trial_ends_at ?? null,
    currentPeriodEnd: row.current_period_end ?? null,
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    comped: row.comped === true,
    plan: row.plan ?? null
  };
}

export async function loadSettingsSubscription(
  reader: SettingsSubscriptionReader,
  timeoutMs: number = SUBSCRIPTION_FETCH_TIMEOUT_MS
): Promise<SettingsSubscriptionLoadResult> {
  try {
    const snapshot = await withTimeout(
      (async () => {
        const { user } = await reader.getUser();
        if (!user) {
          throw new Error("signed-out");
        }
        const { data, error } = await reader.getProfile(user.id);
        if (error) {
          throw new Error(error.message);
        }
        return rowToSnapshot(data);
      })(),
      timeoutMs
    );
    return { kind: "ready", snapshot };
  } catch (e) {
    if (e instanceof SubscriptionLoadTimeoutError) {
      return { kind: "error", reason: "timeout" };
    }
    return { kind: "error", reason: "error" };
  }
}

export function formatDisplayDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

export function planDisplayName(plan: string | null | undefined, status: string | null): string {
  if (status === "trialing" && !plan) return SETTINGS_SUBSCRIPTION_COPY.planTrial;
  if (plan === "monthly") return SETTINGS_SUBSCRIPTION_COPY.planMonthly;
  if (plan === "lifetime" || status === "lifetime") return SETTINGS_SUBSCRIPTION_COPY.planLifetime;
  if (plan && plan.trim()) return plan;
  return SETTINGS_SUBSCRIPTION_COPY.planFallback;
}

function trialDaysCopy(days: number): string {
  // FOUNDER-REVIEW: trial days remaining on the Settings subscription card.
  if (days === 1) return "1 day remaining.";
  return `${days} days remaining.`;
}

export interface SettingsSubscriptionViewModel {
  planName: string;
  headline: string;
  details: string[];
  errorMessage: string | null;
  entitled: boolean;
  canCancel: boolean;
  showSubscribe: boolean;
  showManageBilling: boolean;
  manageBillingHref: string;
  manageBillingLabel: string;
  trialDaysLeft: number | null;
}

export function deriveSettingsSubscriptionView(
  snapshot: SettingsSubscriptionSnapshot,
  now: Date = new Date()
): SettingsSubscriptionViewModel {
  const entitled = hasAccess(
    {
      status: snapshot.status,
      trialEndsAt: snapshot.trialEndsAt,
      comped: snapshot.comped
    },
    now
  );
  const trialDaysLeft =
    snapshot.status === "trialing" ? trialDaysRemaining(snapshot.trialEndsAt, now) : null;
  const trialLabel = formatDisplayDate(snapshot.trialEndsAt);
  const periodLabel = formatDisplayDate(snapshot.currentPeriodEnd);
  const planName = planDisplayName(snapshot.plan, snapshot.status);

  const view: SettingsSubscriptionViewModel = {
    planName,
    headline: SETTINGS_SUBSCRIPTION_COPY.unknown,
    details: [],
    errorMessage: null,
    entitled,
    canCancel: false,
    showSubscribe: false,
    showManageBilling: !snapshot.comped,
    manageBillingHref: SETTINGS_SUBSCRIPTION_COPY.manageBillingHref,
    manageBillingLabel: SETTINGS_SUBSCRIPTION_COPY.manageBillingLabel,
    trialDaysLeft
  };

  if (snapshot.comped) {
    view.headline = SETTINGS_SUBSCRIPTION_COPY.comped;
    view.showManageBilling = false;
    return view;
  }

  if (snapshot.status === "trialing") {
    if (trialDaysLeft != null && trialDaysLeft > 0) {
      view.headline = trialDaysCopy(trialDaysLeft);
      if (trialLabel) view.details.push(`Trial ends ${trialLabel}.`);
    } else if (trialLabel && entitled) {
      view.headline = SETTINGS_SUBSCRIPTION_COPY.trialNoDate;
      view.details.push(`Trial ends ${trialLabel}.`);
    } else if (trialDaysLeft === 0) {
      view.headline = SETTINGS_SUBSCRIPTION_COPY.trialEnded;
      if (trialLabel) view.details.push(`Trial ended ${trialLabel}.`);
    } else {
      view.headline = SETTINGS_SUBSCRIPTION_COPY.trialNoDate;
    }
    view.showSubscribe = true;
    return view;
  }

  if (snapshot.status === "active" && snapshot.cancelAtPeriodEnd) {
    view.headline = periodLabel
      ? `Canceled. Access until ${periodLabel}.`
      : "Canceled. Access continues until the end of your current period.";
    view.details.push(SETTINGS_SUBSCRIPTION_COPY.uncancelHint);
    return view;
  }

  if (snapshot.status === "active") {
    view.headline = periodLabel
      ? `Active. Renews ${periodLabel}.`
      : SETTINGS_SUBSCRIPTION_COPY.activeNoDate;
    view.canCancel = true;
    return view;
  }

  if (snapshot.status === "past_due") {
    view.headline = SETTINGS_SUBSCRIPTION_COPY.pastDue;
    view.canCancel = true;
    return view;
  }

  if (snapshot.status === "canceled") {
    view.headline = periodLabel
      ? `Your subscription ended ${periodLabel}.`
      : SETTINGS_SUBSCRIPTION_COPY.canceledNoDate;
    view.showSubscribe = true;
    return view;
  }

  if (snapshot.status === "lifetime") {
    view.headline = SETTINGS_SUBSCRIPTION_COPY.lifetime;
    view.showManageBilling = false;
    return view;
  }

  if (snapshot.status) {
    view.headline = `Status: ${snapshot.status}.`;
    return view;
  }

  return view;
}

export function errorMessageForReason(reason: "timeout" | "error"): string {
  return reason === "timeout"
    ? SETTINGS_SUBSCRIPTION_COPY.timeout
    : SETTINGS_SUBSCRIPTION_COPY.error;
}
