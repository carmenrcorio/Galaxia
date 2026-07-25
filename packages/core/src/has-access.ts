/**
 * Subscription / entitlement model (card-optional 14-day trial + durable comp).
 * The single source of truth for "can this user use the product right now".
 * Shared by apps/web middleware, apps/mobile route guard, and the vela-chat
 * edge function — one rule, one module. Do not copy this logic inline.
 */

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "lifetime";

export interface Entitlement {
  status?: SubscriptionStatus | string | null;
  /** ISO string or Date; the trial's end for `trialing` status. */
  trialEndsAt?: string | Date | null;
  /**
   * Durable complimentary access (founder / comped accounts). Independent of
   * every billing field. Never written by the RevenueCat webhook.
   */
  comped?: boolean | null;
}

/**
 * Columns the edge / clients read from `profiles` to decide access.
 * Fail closed when the row is missing.
 */
export interface ProfileEntitlementRow {
  subscription_status?: string | null;
  trial_ends_at?: string | null;
  comped?: boolean | null;
}

/**
 * hasAccess = comped || active || lifetime || (trialing && trial_ends_at > now)
 * Comp is checked first and is independent of billing state — a canceled or
 * expired profile stays entitled when `comped` is true.
 * Missing/unknown status is treated as trialing (a just-created account whose
 * profile row/trigger is still settling); a trialing status with no end date
 * has no access under the strict rule. Callers that cannot load a profile at
 * all should decide their own fail-open/closed posture.
 */
export function hasAccess(entitlement: Entitlement | null | undefined, now: Date = new Date()): boolean {
  if (entitlement?.comped === true) return true;
  const status = entitlement?.status ?? "trialing";
  if (status === "active" || status === "lifetime") return true;
  if (status === "trialing") {
    const raw = entitlement?.trialEndsAt;
    if (!raw) return false;
    const end = raw instanceof Date ? raw : new Date(raw);
    return !Number.isNaN(end.getTime()) && end.getTime() > now.getTime();
  }
  return false; // past_due, canceled
}

/**
 * Fail-closed access check over a profiles row (or null when missing).
 * Used by vela-chat after JWT auth and by tests that assert 403 behavior.
 */
export function profileAllowsAccess(
  profile: ProfileEntitlementRow | null | undefined,
  now: Date = new Date()
): boolean {
  if (!profile) return false;
  return hasAccess(
    {
      status: profile.subscription_status,
      trialEndsAt: profile.trial_ends_at,
      comped: profile.comped === true
    },
    now
  );
}

/** Whole days remaining in a trial (0 if ended/unknown). For the calm trial banner. */
export function trialDaysRemaining(trialEndsAt: string | Date | null | undefined, now: Date = new Date()): number {
  if (!trialEndsAt) return 0;
  const end = trialEndsAt instanceof Date ? trialEndsAt : new Date(trialEndsAt);
  if (Number.isNaN(end.getTime())) return 0;
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86_400_000));
}

// FOUNDER-REVIEW: authored — vela-chat 403 when profile missing or unentitled.
export const VELA_ENTITLEMENT_REQUIRED_ERROR =
  "Access required. Your trial has ended or your subscription is inactive — continue on the web to keep using Vela.";
