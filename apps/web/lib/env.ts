export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "",
  iosAppStoreUrl: process.env.NEXT_PUBLIC_IOS_APP_STORE_URL ?? "",
  androidPlayUrl: process.env.NEXT_PUBLIC_ANDROID_PLAY_URL ?? "",
  testflightUrl: process.env.NEXT_PUBLIC_TESTFLIGHT_URL ?? ""
};

export function getSiteUrlFromRequestOrigin(origin?: string) {
  return publicEnv.siteUrl || origin || "";
}
