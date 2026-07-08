import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "../env";

export function createSupabaseBrowserClient() {
  const url = publicEnv.supabaseUrl || "https://placeholder.supabase.co";
  const anon = publicEnv.supabaseAnonKey || "placeholder-anon-key";
  return createBrowserClient(url, anon);
}
