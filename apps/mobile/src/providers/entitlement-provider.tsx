import { hasAccess, trialDaysRemaining, type SubscriptionStatus } from "@galaxia/core";
import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./auth-provider";

/**
 * Entitlement is the shared card-optional trial model (`packages/core`
 * `hasAccess`). There is one product. Access = comped | active | lifetime |
 * live trial. Billing status is set by signup (trial) and by the RevenueCat
 * webhook; `comped` is service-role only.
 *
 * Feature gates belong on `hasAccess` (the authed route lockout already
 * sends anyone without access to `/subscribe`). There is no people cap and
 * no daily Vela cap.
 */
interface EntitlementContextValue {
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  comped: boolean;
  /** The single source of truth: can this user use the product right now. */
  hasAccess: boolean;
  /** True until the first profiles read for the current session settles. */
  loading: boolean;
  trialDaysLeft: number;
  refresh: () => Promise<void>;
}

const EntitlementContext = createContext<EntitlementContextValue | null>(null);

export function EntitlementProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>("trialing");
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [comped, setComped] = useState(false);
  /** Which user id the current status/comped fields were loaded for (null = none). */
  const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);

  const refresh = async () => {
    const userId = session?.user.id;
    if (!userId) {
      setLoadedForUserId(null);
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_status, trial_ends_at, comped")
      .eq("id", userId)
      .maybeSingle();
    setStatus(((profile?.subscription_status as SubscriptionStatus) ?? "trialing"));
    setTrialEndsAt((profile?.trial_ends_at as string | null) ?? null);
    setComped(profile?.comped === true);
    setLoadedForUserId(userId);
  };

  useEffect(() => {
    if (!session?.user.id) {
      setStatus("trialing");
      setTrialEndsAt(null);
      setComped(false);
      setLoadedForUserId(null);
      return;
    }
    // Invalidate immediately so gates wait — do not use stale defaults
    // (trialing + null end → hasAccess false) for a newly arrived session.
    setLoadedForUserId(null);
    void refresh();
  }, [session?.user.id]);

  const loading = Boolean(session?.user.id) && loadedForUserId !== session?.user.id;

  const value = useMemo<EntitlementContextValue>(() => {
    const access = hasAccess({ status, trialEndsAt, comped });
    return {
      status,
      trialEndsAt,
      comped,
      hasAccess: access,
      loading,
      trialDaysLeft: trialDaysRemaining(trialEndsAt),
      refresh
    };
  }, [status, trialEndsAt, comped, loading, session?.user.id]);

  return <EntitlementContext.Provider value={value}>{children}</EntitlementContext.Provider>;
}

export function useEntitlement() {
  const context = useContext(EntitlementContext);
  if (!context) throw new Error("useEntitlement must be used within EntitlementProvider");
  return context;
}
