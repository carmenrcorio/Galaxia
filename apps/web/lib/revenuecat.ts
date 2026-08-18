import type { SubscriptionStatus } from "@galaxia/core";

/**
 * RevenueCat Web Billing — pure, framework-free helpers shared by the webhook
 * route (server) and the paywall (client). No secrets, no SDK, no Node built-ins
 * are imported here so it is safe to pull into either bundle and to unit test.
 *
 * Access model reminder: `@galaxia/core` `hasAccess` is the ONE access decision
 * (`comped` OR active/lifetime OR a live trial). This file only maps a
 * RevenueCat event onto the four billing columns:
 * `subscription_status`, `current_period_end`, `plan`, `cancel_at_period_end`.
 * It never reads or writes `comped`. The webhook is the source of truth for
 * paid billing status only.
 */

/** The single entitlement that unlocks the product. Checked client-side after a purchase. */
export const RC_ENTITLEMENT_ID = "GalaxiaMea App Unlimited";

/** We launch monthly-only; annual/lifetime are not set up in RevenueCat yet. */
export const RC_PLAN = "monthly";

/**
 * Which RevenueCat Web Billing key the app was handed, read from its prefix.
 * Every Web Billing key starts `rcb_`; the sandbox variant is `rcb_sb_`.
 *
 * The app has no notion of "test mode" of its own — the mode is entirely a
 * property of the key in NEXT_PUBLIC_REVENUECAT_PUBLIC_KEY, and the RevenueCat
 * project's own Stripe connection decides whether that mode can take real
 * money. This helper exists so a failed purchase can name the mode it was in
 * without ever printing the key.
 */
export type RcKeyMode = "sandbox" | "production" | "unrecognized" | "missing";

export function rcKeyMode(key: string | null | undefined): RcKeyMode {
  if (!key) return "missing";
  if (key.startsWith("rcb_sb_")) return "sandbox";
  if (key.startsWith("rcb_")) return "production";
  return "unrecognized";
}

/**
 * RevenueCat Web SDK error codes we say something specific about. Mirrors
 * `ErrorCode` in `@revenuecat/purchases-js` by value on purpose: this module is
 * also imported by the server-side webhook route, so it must stay free of SDK
 * imports (see the note at the top of the file).
 */
export const RC_ERROR_CODE = {
  userCancelled: 1,
  storeProblem: 2,
  alreadyPurchased: 6,
  network: 10,
  invalidCredentials: 11,
  invalidAppUserId: 14,
  alreadyInProgress: 15,
  unknownBackend: 16,
  paymentPending: 20,
  configuration: 23,
  unsupported: 24
} as const;

/**
 * User-facing copy for a failed purchase. Deliberately claims only what the
 * error code actually establishes (ENGINEERING.md §12): a pending payment is
 * not reported as a failure, and a misconfigured key does not tell the user to
 * keep retrying something that cannot succeed. Returns `null` when there is
 * nothing to say — the user closed the checkout themselves.
 *
 * No error code, key or internal detail appears in the returned string
 * (ENGINEERING.md §7); the numeric code goes to the console for us instead.
 */
export function purchaseErrorCopy(code: number | null | undefined): string | null {
  switch (code) {
    case RC_ERROR_CODE.userCancelled:
      return null;
    case RC_ERROR_CODE.paymentPending:
      return "Your payment is still being confirmed. We'll unlock your galaxy as soon as it clears — no need to pay again.";
    case RC_ERROR_CODE.alreadyPurchased:
      return "You're already subscribed. Refresh this page, or manage your plan from your account.";
    case RC_ERROR_CODE.network:
      return "We couldn't reach the payment provider. Check your connection and try again.";
    case RC_ERROR_CODE.alreadyInProgress:
      return "A checkout is already open. Finish or close it, then try again.";
    case RC_ERROR_CODE.invalidCredentials:
    case RC_ERROR_CODE.configuration:
    case RC_ERROR_CODE.unsupported:
    case RC_ERROR_CODE.invalidAppUserId:
      // Nothing the user can do — payments are misconfigured on our side.
      return "Payments aren't set up correctly right now. This is on us, not you — please try again later.";
    default:
      // Includes unknownBackend (16) and storeProblem (2). We do not know
      // whether a charge was attempted, so we do not claim either way.
      return "Something went wrong and the purchase didn't complete. Please try again.";
  }
}

export interface RevenueCatEvent {
  /** RevenueCat event type, e.g. INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, PRODUCT_CHANGE. */
  type?: string;
  /** Unique event id (useful for dedupe/idempotency). */
  id?: string;
  /** The RevenueCat App User ID. We set this to the Supabase user.id (= profiles.id). */
  app_user_id?: string;
  original_app_user_id?: string;
  product_id?: string;
  entitlement_ids?: string[];
  /** Access end, ms since epoch. Null for non-subscription/lifetime products. */
  expiration_at_ms?: number | null;
  environment?: string;
  store?: string;
}

export interface RevenueCatWebhookBody {
  api_version?: string;
  event?: RevenueCatEvent;
}

export interface ProfileSubscriptionUpdate {
  subscription_status: SubscriptionStatus;
  /** ISO string written to profiles.current_period_end, or null when unknown. */
  current_period_end: string | null;
  plan: string | null;
  /**
   * Auto-renew is off, but access continues until current_period_end.
   * UI-only: hasAccess still keys off subscription_status (stays `active`
   * through CANCELLATION). Cleared when they renew or the period expires.
   */
  cancel_at_period_end: boolean;
}

function msToIso(ms: number | null | undefined): string | null {
  if (ms == null || !Number.isFinite(ms)) return null;
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Map a RevenueCat event to the profile columns `hasAccess` reads. Returns
 * `null` for events we intentionally do not act on (so the webhook can 200-ack
 * them without changing state).
 *
 * Why CANCELLATION stays `active`: in RevenueCat, CANCELLATION means the user
 * turned OFF auto-renew — they keep access until the period ends. Access is
 * revoked by the later EXPIRATION event. Flipping to `canceled` here would make
 * `hasAccess` (unchanged) return false immediately and lock the user out mid-
 * period they already paid for — a broken promise (see the cancel copy: "access
 * continues until <period end>"). So CANCELLATION keeps them entitled and only
 * EXPIRATION downgrades to `canceled`.
 */
export function mapRevenueCatEvent(
  event: RevenueCatEvent | null | undefined
): ProfileSubscriptionUpdate | null {
  if (!event || !event.type) return null;
  const periodEnd = msToIso(event.expiration_at_ms);

  switch (event.type) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "PRODUCT_CHANGE":
    case "UNCANCELLATION":
      return {
        subscription_status: "active",
        current_period_end: periodEnd,
        plan: RC_PLAN,
        cancel_at_period_end: false
      };
    case "CANCELLATION":
      // Auto-renew off, but still entitled until the period ends. See doc above.
      // Flag the scheduled cancel for Settings UI without flipping hasAccess.
      return {
        subscription_status: "active",
        current_period_end: periodEnd,
        plan: RC_PLAN,
        cancel_at_period_end: true
      };
    case "EXPIRATION":
      return {
        subscription_status: "canceled",
        current_period_end: periodEnd,
        plan: RC_PLAN,
        cancel_at_period_end: false
      };
    default:
      // BILLING_ISSUE, TRANSFER, TEST, SUBSCRIBER_ALIAS, etc. — no status change.
      return null;
  }
}

/**
 * Constant-time comparison of the incoming Authorization header against the
 * expected shared secret (REVENUECAT_WEBHOOK_AUTH). Security-critical: this is
 * the only gate that lets a webhook grant paid status.
 *
 * Fails closed: an unset expected secret or a missing/mismatched provided value
 * always returns false. Implemented without Node built-ins so this module stays
 * bundle-safe for the client too.
 */
export function verifyWebhookAuth(provided: string | null | undefined, expected: string): boolean {
  if (!expected) return false;
  if (!provided) return false;
  if (provided.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < provided.length; i++) {
    mismatch |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}
