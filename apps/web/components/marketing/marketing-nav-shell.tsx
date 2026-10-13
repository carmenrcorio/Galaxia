import { publicEnv } from "../../lib/env";
import { createSupabaseServerClient } from "../../lib/supabase/server";
import { MarketingNav } from "./marketing-nav";

/** Resolves session on the server so logged-in visitors get AppNav on first paint (no nav swap CLS). */
export async function MarketingNavShell() {
  let initialUserId: string | null = null;
  if (publicEnv.supabaseUrl && publicEnv.supabaseAnonKey) {
    try {
      const supabase = await createSupabaseServerClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      initialUserId = user?.id ?? null;
    } catch {
      initialUserId = null;
    }
  }
  return <MarketingNav initialUserId={initialUserId} />;
}
