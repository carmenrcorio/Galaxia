export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "",
  iosAppStoreUrl: process.env.NEXT_PUBLIC_IOS_APP_STORE_URL ?? "",
  androidPlayUrl: process.env.NEXT_PUBLIC_ANDROID_PLAY_URL ?? "",
  testflightUrl: process.env.NEXT_PUBLIC_TESTFLIGHT_URL ?? "",
  foundingEnabled: process.env.NEXT_PUBLIC_FOUNDING_ENABLED === "true",
  // RevenueCat Web Billing publishable key. Safe to expose to the browser; it
  // only lets the Web SDK start a purchase, it cannot grant entitlements.
  revenueCatPublicKey: process.env.NEXT_PUBLIC_REVENUECAT_PUBLIC_KEY ?? ""
};

export const privateEnv = {
  serviceRole: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  // Unused: Stripe lives inside the RevenueCat dashboard under the Web Billing
  // approach (RevenueCat talks to Stripe, the app never does). Left in place,
  // harmless, so nothing that still references it breaks.
  stripeSecret: process.env.STRIPE_SECRET_KEY ?? ""
};

/**
 * RevenueCat server + public configuration, grouped so the public/secret split
 * is unmistakable:
 *   - `publicKey`   → NEXT_PUBLIC_REVENUECAT_PUBLIC_KEY (mirrored on publicEnv, browser-safe)
 *   - `secretKey`   → REVENUECAT_SECRET_KEY   (server only — REST v2 secret key; NEVER NEXT_PUBLIC_)
 *   - `webhookAuth` → REVENUECAT_WEBHOOK_AUTH (server only — the Authorization header value
 *                     configured on the RC webhook; the webhook route verifies it)
 *   - `projectId`   → REVENUECAT_PROJECT_ID   (server only — required in the REST v2 path to
 *                     cancel a Web Billing subscription)
 * Secret values are never read into the client bundle and are never logged.
 */
export const revenueCatEnv = {
  publicKey: process.env.NEXT_PUBLIC_REVENUECAT_PUBLIC_KEY ?? "",
  secretKey: process.env.REVENUECAT_SECRET_KEY ?? "",
  webhookAuth: process.env.REVENUECAT_WEBHOOK_AUTH ?? "",
  projectId: process.env.REVENUECAT_PROJECT_ID ?? ""
};

/**
 * Returns a readable "missing variable" message naming the exact env var, per
 * ENGINEERING.md §6 (a function must fail with a message naming the missing
 * variable, never a bare 500). Callers use this to build their error response.
 */
export function missingEnvMessage(name: string): string {
  return `${name} is not configured. Set it in the environment to enable this feature.`;
}

export function getSiteUrlFromRequestOrigin(origin?: string) {
  return publicEnv.siteUrl || origin || "";
}
