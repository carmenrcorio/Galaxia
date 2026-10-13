import { trialDaysRemaining } from "@galaxia/core";

export interface TrialBannerState {
  visible: boolean;
  trialEndsAt: string | null;
}

export function trialBannerFromProfile(profile: {
  subscription_status: string | null;
  trial_ends_at: string | null;
  comped: boolean | null;
} | null): TrialBannerState {
  if (!profile || profile.comped === true || profile.subscription_status !== "trialing") {
    return { visible: false, trialEndsAt: null };
  }
  const trialEndsAt = profile.trial_ends_at?.trim() ?? "";
  if (!trialEndsAt) return { visible: false, trialEndsAt: null };
  const ends = new Date(trialEndsAt);
  if (Number.isNaN(ends.getTime())) return { visible: false, trialEndsAt: null };
  if (trialDaysRemaining(trialEndsAt) < 0) return { visible: false, trialEndsAt: null };
  return { visible: true, trialEndsAt };
}
