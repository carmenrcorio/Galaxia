import "server-only";

export const privateEnv = {
  serviceRole: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  // Unused: Stripe lives inside the RevenueCat dashboard under the Web Billing
  // approach (RevenueCat talks to Stripe, the app never does). Left in place,
  // harmless, so nothing that still references it breaks.
  stripeSecret: process.env.STRIPE_SECRET_KEY ?? ""
};

/**
 * RevenueCat server-only secrets. The publishable key
 * (NEXT_PUBLIC_REVENUECAT_PUBLIC_KEY) is browser-safe and lives on
 * `publicEnv.revenueCatPublicKey` in `./env` instead — it is intentionally
 * not mirrored here.
 *   - `secretKey`   → REVENUECAT_SECRET_KEY   (server only — REST v2 secret key; NEVER NEXT_PUBLIC_)
 *   - `webhookAuth` → REVENUECAT_WEBHOOK_AUTH (server only — the Authorization header value
 *                     configured on the RC webhook; the webhook route verifies it)
 *   - `projectId`   → REVENUECAT_PROJECT_ID   (server only — required in the REST v2 path to
 *                     cancel a Web Billing subscription)
 * Secret values are never read into the client bundle and are never logged.
 */
export const revenueCatEnv = {
  secretKey: process.env.REVENUECAT_SECRET_KEY ?? "",
  webhookAuth: process.env.REVENUECAT_WEBHOOK_AUTH ?? "",
  projectId: process.env.REVENUECAT_PROJECT_ID ?? ""
};
