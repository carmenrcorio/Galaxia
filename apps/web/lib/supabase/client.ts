import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "../env";

export function createSupabaseBrowserClient() {
  return createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
}
