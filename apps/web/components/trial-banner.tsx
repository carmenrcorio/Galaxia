"use client";

import { trialDaysRemaining } from "@galaxia/core";
import Link from "next/link";
import { useEffect, useState } from "react";
import { trialBannerFromProfile, type TrialBannerState } from "../lib/trial-banner-logic";
import { createSupabaseBrowserClient } from "../lib/supabase/client";

const HIDDEN: TrialBannerState = { visible: false, trialEndsAt: null };

/**
 * Calm, non-urgent trial banner. Shows only while `subscription_status` is
 * 'trialing' and the account is not comped. No countdown, no red, no
 * "don't miss out" — a warm, factual line with a link to /subscribe.
 */
export function TrialBanner({ initial = HIDDEN }: { initial?: TrialBannerState }) {
  const [banner, setBanner] = useState<TrialBannerState>(initial);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setBanner(HIDDEN);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("subscription_status, trial_ends_at, comped")
        .eq("id", user.id)
        .maybeSingle();
      setBanner(
        trialBannerFromProfile(
          data as { subscription_status: string | null; trial_ends_at: string | null; comped: boolean | null } | null
        )
      );
    });
  }, []);

  if (!banner.visible || !banner.trialEndsAt) return null;
  const trialEndsAt = banner.trialEndsAt;
  const ends = new Date(trialEndsAt);
  if (Number.isNaN(ends.getTime())) return null;
  const daysLeft = trialDaysRemaining(trialEndsAt);
  const dateLabel = ends.toLocaleDateString(undefined, { month: "long", day: "numeric" });

  return (
    <div
      style={{
        background: "rgba(183,154,216,.08)",
        borderBottom: "1px solid rgba(183,154,216,.16)",
        color: "var(--mist)",
      }}
    >
      <div
        className="container"
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, paddingTop: 8, paddingBottom: 8, fontSize: ".82rem", flexWrap: "wrap" }}
      >
        <span>
          Trial ends {dateLabel}
          {daysLeft > 0 ? ` · ${daysLeft} ${daysLeft === 1 ? "day" : "days"} left` : ""}
        </span>
        <Link href="/subscribe" style={{ color: "var(--gold-soft)", fontWeight: 600 }}>
          Continue with Galaxia →
        </Link>
      </div>
    </div>
  );
}
