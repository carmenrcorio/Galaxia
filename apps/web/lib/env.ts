export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "",
  iosAppStoreUrl: process.env.NEXT_PUBLIC_IOS_APP_STORE_URL ?? "",
  androidPlayUrl: process.env.NEXT_PUBLIC_ANDROID_PLAY_URL ?? "",
  testflightUrl: process.env.NEXT_PUBLIC_TESTFLIGHT_URL ?? ""
};

export const privateEnv = {
  serviceRole: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  stripeSecret: process.env.STRIPE_SECRET_KEY ?? ""
};

export function getSiteUrlFromRequestOrigin(origin?: string) {
  return publicEnv.siteUrl || origin || "";
}
