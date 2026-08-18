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
 * Which RevenueCat key the app was handed, read from its prefix alone.
 *
 * The app has no notion of "test mode" of its own — which mode and which
 * billing engine a purchase runs through is entirely a property of the key in
 * NEXT_PUBLIC_REVENUECAT_PUBLIC_KEY. This exists so a failed purchase can name
 * the key it was using without ever printing the key.
 *
 * Two distinctions matter, and they are different questions:
 *   - Engine: we integrate RevenueCat Billing (`rcb_`, formerly Web Billing).
 *     `purchases-js` also accepts Stripe Billing (`strp_`), Paddle (`pdl_`) and
 *     Test Store (`test_`) keys, so one of those configures cleanly and then
 *     fails at the backend — the RevenueCat project has to have that engine's
 *     config, products and offering set up for the purchase to resolve.
 *   - Mode: only RevenueCat Billing keys carry the mode in the prefix
 *     (`rcb_sb_` sandbox vs `rcb_` production). For the other engines the mode
 *     belongs to the connected Stripe/Paddle account, not to the key, so it
 *     cannot be read here at all.
 * Anything else (a mobile SDK key, a secret key) the SDK rejects outright.
 */
export type RcKeyKind =
  | "missing"
  | "revenuecat-billing-sandbox"
  | "revenuecat-billing-production"
  | "stripe-billing"
  | "paddle-billing"
  | "test-store"
  | "mobile-sdk-key"
  | "secret-key"
  | "unrecognized";

export function rcKeyKind(key: string | null | undefined): RcKeyKind {
  if (!key) return "missing";
  if (key.startsWith("rcb_sb_")) return "revenuecat-billing-sandbox";
  if (key.startsWith("rcb_")) return "revenuecat-billing-production";
  if (key.startsWith("strp_")) return "stripe-billing";
  if (key.startsWith("pdl_")) return "paddle-billing";
  if (key.startsWith("test_")) return "test-store";
  if (key.startsWith("appl_") || key.startsWith("goog_") || key.startsWith("amzn_")) {
    return "mobile-sdk-key";
  }
  if (key.startsWith("sk_")) return "secret-key";
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
 * Backend error codes we have actually seen on this project. `purchases-js`
 * only recognizes codes in its own 7xxx range, so anything outside it arrives
 * as an unknown backend error with the real number left in the response body.
 *
 * 8142 was observed live on a `postCheckoutStart` call that returned HTTP 422.
 * It is not in RevenueCat's published enum, so we treat it as exactly what is
 * on the wire and nothing more: the backend refused to create the checkout
 * session. We do not name a cause for it anywhere the user can see.
 */
export const RC_BACKEND_CODE = {
  checkoutSessionRejected: 8142
} as const;

/** HTTP status the backend returns when it refuses to create the session. */
const UNPROCESSABLE_ENTITY = 422;

/**
 * Everything we know about a failed purchase, gathered from the thrown
 * `PurchasesError` without interpreting any of it. Kept as a plain object so
 * this module stays SDK-free and the classification below stays unit testable.
 */
export interface RcPurchaseFailure {
  /** `PurchasesError.errorCode`. */
  errorCode?: number | null;
  /**
   * `PurchasesError.extra.backendErrorCode`. Present only when the SDK did not
   * re-wrap the error. The checkout modal's own error handler rebuilds the
   * error through `getForPurchasesFlowError`, which drops `extra`, so this is
   * null on that path even though the same backend code caused the failure.
   */
  backendErrorCode?: number | null;
  /**
   * `PurchasesError.underlyingErrorMessage`, verbatim. Shaped by the SDK as
   * `Request: <endpoint>. Status code: <status>. Body: <body>.` and preserved
   * across the re-wrap, which makes it the one signal available on both paths.
   */
  underlyingErrorMessage?: string | null;
}

/** What a `underlyingErrorMessage` literally says. Absent parts stay null. */
export interface RcBackendFailure {
  /** SDK endpoint name, e.g. `postCheckoutStart`. */
  request: string | null;
  /** HTTP status the RevenueCat backend returned, e.g. 422. */
  httpStatus: number | null;
  /** Top-level `code` from the response body, e.g. 8142. */
  backendErrorCode: number | null;
}

/**
 * The SDK endpoints that open a checkout session. Deliberately not every
 * `postCheckout*` call: `postCheckoutComplete` runs after the user has entered
 * card details, so a failure there is not "we could not start checkout" and
 * must not be described as one.
 */
const CHECKOUT_OPENING_REQUESTS = new Set(["postCheckoutPrepare", "postCheckoutStart"]);

const REQUEST_PATTERN = /Request:\s*([A-Za-z0-9_]+)\s*\./;
const STATUS_PATTERN = /Status code:\s*(\d{3})\s*\./;
const BODY_PATTERN = /Body:\s*([\s\S]*?)\.?\s*$/;
const BODY_CODE_PATTERN = /"code"\s*:\s*(-?\d+)/;

/**
 * Read the endpoint, HTTP status and backend code out of the SDK's underlying
 * error message. Parsing only: a field that is not in the string comes back
 * null rather than being guessed at.
 */
export function parseRcBackendFailure(
  underlyingErrorMessage: string | null | undefined
): RcBackendFailure {
  const empty: RcBackendFailure = { request: null, httpStatus: null, backendErrorCode: null };
  if (!underlyingErrorMessage) return empty;

  const request = REQUEST_PATTERN.exec(underlyingErrorMessage)?.[1] ?? null;

  const statusMatch = STATUS_PATTERN.exec(underlyingErrorMessage)?.[1];
  const parsedStatus = statusMatch ? Number(statusMatch) : NaN;
  const httpStatus = Number.isFinite(parsedStatus) ? parsedStatus : null;

  return { request, httpStatus, backendErrorCode: parseBodyErrorCode(underlyingErrorMessage) };
}

/**
 * The response body's own `code`. Parsed as JSON first so only a top-level
 * `code` counts; the regex is a fallback for a body the SDK truncated or that
 * was never JSON, and there it takes the first `"code"` it finds.
 */
function parseBodyErrorCode(underlyingErrorMessage: string): number | null {
  const body = BODY_PATTERN.exec(underlyingErrorMessage)?.[1]?.trim();
  if (!body) return null;

  try {
    const parsed: unknown = JSON.parse(body);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const code = (parsed as { code?: unknown }).code;
      if (typeof code === "number" && Number.isFinite(code)) return code;
      return null;
    }
  } catch {
    // Not JSON, or truncated mid-object. Fall through to the regex.
  }

  const loose = BODY_CODE_PATTERN.exec(body)?.[1];
  if (!loose) return null;
  const code = Number(loose);
  return Number.isFinite(code) ? code : null;
}

/**
 * The backend's own error code for this failure, from whichever of the two
 * places survived: `extra` when the SDK kept it, otherwise the response body
 * inside the underlying message. Null when neither carries one, never a guess.
 */
export function rcBackendErrorCode(failure: RcPurchaseFailure): number | null {
  if (typeof failure.backendErrorCode === "number" && Number.isFinite(failure.backendErrorCode)) {
    return failure.backendErrorCode;
  }
  return parseRcBackendFailure(failure.underlyingErrorMessage).backendErrorCode;
}

/**
 * Whether the backend refused to start the checkout session, rather than the
 * purchase failing partway through.
 *
 * This must not key off the SDK's `errorCode`. The same rejection surfaces as
 * `UnknownBackendError` (16) when it is thrown straight out of an SDK call, and
 * as `StoreProblemError` (2) when it comes back through the checkout modal,
 * which remaps the code and drops `extra`. Both retain the underlying message,
 * so the two signals below are read instead:
 *
 *   - the backend code, from `extra` or from the response body; or
 *   - a checkout endpoint answering 422, which is a request the server
 *     understood and refused, not a fault that clears on its own.
 */
export function isCheckoutSetupRejection(failure: RcPurchaseFailure): boolean {
  if (rcBackendErrorCode(failure) === RC_BACKEND_CODE.checkoutSessionRejected) return true;

  const { request, httpStatus } = parseRcBackendFailure(failure.underlyingErrorMessage);
  return request !== null && CHECKOUT_OPENING_REQUESTS.has(request) && httpStatus === UNPROCESSABLE_ENTITY;
}

// FOUNDER-REVIEW: authored. Shown when the backend refuses to open checkout, so
// it has to be true of every such refusal: we know checkout never opened and
// that the refusal came from our side, and we know nothing else. It names no
// cause, claims nothing about the user's card or money, and does not promise
// that trying again will work, because for a setup rejection it will not.
const CHECKOUT_SETUP_REJECTED_COPY =
  "We couldn't start checkout on our end. This one is ours to fix, so please check back a little later rather than trying again now.";

/**
 * User-facing copy for a failed purchase. Deliberately claims only what the
 * failure actually establishes (ENGINEERING.md §12): a pending payment is
 * not reported as a failure, and a misconfigured key does not tell the user to
 * keep retrying something that cannot succeed. Returns `null` when there is
 * nothing to say — the user closed the checkout themselves.
 *
 * Takes either the whole failure or, where the error code is genuinely all we
 * have, the code on its own. Passing the failure is what lets a checkout setup
 * rejection be told apart from a transient backend fault, since the two share
 * an error code.
 *
 * No error code, key or internal detail appears in the returned string
 * (ENGINEERING.md §7); the numeric codes go to the console for us instead.
 */
export function purchaseErrorCopy(
  failure: number | RcPurchaseFailure | null | undefined
): string | null {
  const normalized: RcPurchaseFailure =
    failure == null ? { errorCode: null } : typeof failure === "number" ? { errorCode: failure } : failure;
  const code = normalized.errorCode;

  // These three codes assert something specific about the user's own money or
  // session, so they outrank the rejection check below. If a payment is in
  // flight we must not overwrite that with "checkout never started".
  switch (code) {
    case RC_ERROR_CODE.userCancelled:
      return null;
    case RC_ERROR_CODE.paymentPending:
      return "Your payment is still being confirmed. We'll unlock your galaxy as soon as it clears — no need to pay again.";
    case RC_ERROR_CODE.alreadyPurchased:
      return "You're already subscribed. Refresh this page, or manage your plan from your account.";
  }

  if (isCheckoutSetupRejection(normalized)) return CHECKOUT_SETUP_REJECTED_COPY;

  switch (code) {
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
      // Includes unknownBackend (16) and storeProblem (2) once a checkout setup
      // rejection has been ruled out above. We do not know whether a charge was
      // attempted, so we do not claim either way.
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
