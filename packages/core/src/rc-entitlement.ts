/**
 * The RevenueCat dashboard entitlement identifier.
 *
 * Must match the dashboard identifier exactly (case- and space-sensitive).
 * The web paywall looks this key up on `customerInfo.entitlements.active`
 * after a purchase so it knows whether to wait for the webhook. A mismatch
 * does not grant or deny access — `@galaxia/core` `hasAccess` still reads
 * `profiles.subscription_status`, and the webhook maps by `event.type`, not
 * this string. The webhook remains the only writer of paid status.
 *
 * Keep the identifier in this one exported constant. Do not copy the string.
 */
export const RC_ENTITLEMENT_ID = "GalaxiaMea App Unlimited";
