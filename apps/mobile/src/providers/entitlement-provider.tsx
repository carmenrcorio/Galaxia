import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { cacheGet, cacheSet } from "../lib/cache";
import { supabase } from "../lib/supabase";
import { useAuth } from "./auth-provider";

type Tier = "free" | "plus";

interface EntitlementContextValue {
  tier: Tier;
  peopleLimit: number;
  dailyVelaLimit: number;
  velaUsedToday: number;
  canUseGroups: boolean;
  canUseSharedSpaces: boolean;
  canUseWebAccess: boolean;
  canAddPerson: (currentPeopleCount: number) => boolean;
  canSendVelaMessage: () => boolean;
  recordVelaMessageSent: () => Promise<void>;
  setTier: (nextTier: Tier) => Promise<void>;
  refresh: () => Promise<void>;
}

const TODAY_KEY = () => new Date().toISOString().slice(0, 10);

const EntitlementContext = createContext<EntitlementContextValue | null>(null);

export function EntitlementProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const [tier, setTierState] = useState<Tier>("free");
  const [velaUsedToday, setVelaUsedToday] = useState(0);

  const refresh = async () => {
    if (!session?.user.id) return;
    const [{ data: profile }, usage] = await Promise.all([
      supabase.from("profiles").select("subscription_tier").eq("id", session.user.id).single(),
      cacheGet<Record<string, number>>(`vela_usage:${session.user.id}`)
    ]);
    setTierState((profile?.subscription_tier as Tier) ?? "free");
    setVelaUsedToday(usage?.[TODAY_KEY()] ?? 0);
  };

  useEffect(() => {
    if (!session?.user.id) return;
    void refresh();
  }, [session?.user.id]);

  const peopleLimit = tier === "plus" ? Number.POSITIVE_INFINITY : 5;
  const dailyVelaLimit = tier === "plus" ? Number.POSITIVE_INFINITY : 12;

  const value = useMemo<EntitlementContextValue>(
    () => ({
      tier,
      peopleLimit,
      dailyVelaLimit,
      velaUsedToday,
      canUseGroups: tier === "plus",
      canUseSharedSpaces: tier === "plus",
      canUseWebAccess: tier === "plus",
      canAddPerson: (currentPeopleCount) => currentPeopleCount < peopleLimit,
      canSendVelaMessage: () => velaUsedToday < dailyVelaLimit,
      recordVelaMessageSent: async () => {
        if (!session?.user.id) return;
        const key = `vela_usage:${session.user.id}`;
        const usage = (await cacheGet<Record<string, number>>(key)) ?? {};
        usage[TODAY_KEY()] = (usage[TODAY_KEY()] ?? 0) + 1;
        await cacheSet(key, usage);
        setVelaUsedToday(usage[TODAY_KEY()]);
      },
      setTier: async (nextTier) => {
        if (!session?.user.id) return;
        await supabase.from("profiles").upsert({ id: session.user.id, subscription_tier: nextTier });
        setTierState(nextTier);
      },
      refresh
    }),
    [dailyVelaLimit, peopleLimit, session?.user.id, tier, velaUsedToday]
  );

  return <EntitlementContext.Provider value={value}>{children}</EntitlementContext.Provider>;
}

export function useEntitlement() {
  const context = useContext(EntitlementContext);
  if (!context) throw new Error("useEntitlement must be used within EntitlementProvider");
  return context;
}
