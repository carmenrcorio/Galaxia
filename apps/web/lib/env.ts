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
