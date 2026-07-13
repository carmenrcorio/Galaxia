import type { SubscriptionStatus } from "@galaxia/core";

/**
 * RevenueCat Web Billing — pure, framework-free helpers shared by the webhook
 * route (server) and the paywall (client). No secrets, no SDK, no Node built-ins
 * are imported here so it is safe to pull into either bundle and to unit test.
 *
 * Access model reminder: `@galaxia/core` `hasAccess` is the ONE access decision
 * (active/lifetime, or a live trial). It is intentionally unchanged. This file
 * only decides how a RevenueCat event maps onto the `profiles` columns that
 * `hasAccess` reads. The webhook is the single source of truth for paid status.
 */

/** The single entitlement that unlocks the product. Checked client-side after a purchase. */
export const RC_ENTITLEMENT_ID = "GalaxiaMea App Pro";

/** We launch monthly-only; annual/lifetime are not set up in RevenueCat yet. */
export const RC_PLAN = "monthly";

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
      return { subscription_status: "active", current_period_end: periodEnd, plan: RC_PLAN };
    case "CANCELLATION":
      // Auto-renew off, but still entitled until the period ends. See doc above.
      return { subscription_status: "active", current_period_end: periodEnd, plan: RC_PLAN };
    case "EXPIRATION":
      return { subscription_status: "canceled", current_period_end: periodEnd, plan: RC_PLAN };
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
