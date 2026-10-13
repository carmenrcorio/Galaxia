import "server-only";

import { publicEnv } from "./env";
import { createSupabaseServerClient } from "./supabase/server";
import { trialBannerFromProfile, type TrialBannerState } from "./trial-banner-logic";

export type { TrialBannerState };

/** Server read so the trial strip does not pop in after hydration on /app/*. */
export async function getTrialBannerState(): Promise<TrialBannerState> {
  if (!publicEnv.supabaseUrl || !publicEnv.supabaseAnonKey) {
    return { visible: false, trialEndsAt: null };
  }
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return { visible: false, trialEndsAt: null };
    const { data } = await supabase
      .from("profiles")
      .select("subscription_status, trial_ends_at, comped")
      .eq("id", user.id)
      .maybeSingle();
    return trialBannerFromProfile(
      data as { subscription_status: string | null; trial_ends_at: string | null; comped: boolean | null } | null
    );
  } catch {
    return { visible: false, trialEndsAt: null };
  }
}
