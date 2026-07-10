import { hasAccess, trialDaysRemaining, type SubscriptionStatus } from "@galaxia/core";
import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./auth-provider";

/**
 * Entitlement is now the shared card-optional trial model (packages/core
 * `hasAccess`), not a free/plus tier. There is ONE product; nothing is gated on
 * the number of people or messages. Access = active | lifetime | live trial.
 *
 * The previous `setTier` debug switch — which let a user grant themselves a paid
 * plan by writing `subscription_tier` — is REMOVED (ENGINEERING.md §7 revenue
 * bug). Status is set by signup (trial) and by the Stripe webhook only.
 *
 * The `@deprecated` fields below are non-gating compatibility shims so existing
 * mobile screens keep compiling during the trial-model rollout. They no longer
 * impose any limit; a follow-up mobile pass will delete them and the remaining
 * "Galaxia+" display copy (mobile is not yet store-deployed).
 */
interface EntitlementContextValue {
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  /** The single source of truth: can this user use the product right now. */
  hasAccess: boolean;
  trialDaysLeft: number;
  refresh: () => Promise<void>;

  /** @deprecated non-gating shim — derived from hasAccess, not settable. */
  tier: "free" | "plus";
  /** @deprecated no people cap exists. */
  peopleLimit: number;
  /** @deprecated no daily message cap exists. */
  dailyVelaLimit: number;
  /** @deprecated always 0; no per-day counting. */
  velaUsedToday: number;
  /** @deprecated use hasAccess. */
  canUseGroups: boolean;
  /** @deprecated use hasAccess. */
  canUseSharedSpaces: boolean;
  /** @deprecated use hasAccess. */
  canUseWebAccess: boolean;
  /** @deprecated no people cap. */
  canAddPerson: (currentPeopleCount: number) => boolean;
  /** @deprecated use hasAccess. */
  canSendVelaMessage: () => boolean;
  /** @deprecated no-op; no per-day counting. */
  recordVelaMessageSent: () => Promise<void>;
}

const EntitlementContext = createContext<EntitlementContextValue | null>(null);

export function EntitlementProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>("trialing");
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);

  const refresh = async () => {
    if (!session?.user.id) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_status, trial_ends_at")
      .eq("id", session.user.id)
      .maybeSingle();
    setStatus(((profile?.subscription_status as SubscriptionStatus) ?? "trialing"));
    setTrialEndsAt((profile?.trial_ends_at as string | null) ?? null);
  };

  useEffect(() => {
    if (!session?.user.id) return;
    void refresh();
  }, [session?.user.id]);

  const value = useMemo<EntitlementContextValue>(() => {
    const access = hasAccess({ status, trialEndsAt });
    return {
      status,
      trialEndsAt,
      hasAccess: access,
      trialDaysLeft: trialDaysRemaining(trialEndsAt),
      refresh,
      // deprecated shims — non-gating
      tier: access ? "plus" : "free",
      peopleLimit: Number.POSITIVE_INFINITY,
      dailyVelaLimit: Number.POSITIVE_INFINITY,
      velaUsedToday: 0,
      canUseGroups: access,
      canUseSharedSpaces: access,
      canUseWebAccess: access,
      canAddPerson: () => true,
      canSendVelaMessage: () => access,
      recordVelaMessageSent: async () => {}
    };
  }, [status, trialEndsAt, session?.user.id]);

  return <EntitlementContext.Provider value={value}>{children}</EntitlementContext.Provider>;
}

export function useEntitlement() {
  const context = useContext(EntitlementContext);
  if (!context) throw new Error("useEntitlement must be used within EntitlementProvider");
  return context;
}
