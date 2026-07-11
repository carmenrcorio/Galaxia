"use client";

import { trialDaysRemaining } from "@galaxia/core";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "../lib/supabase/client";

/**
 * Calm, non-urgent trial banner. Shows only while `subscription_status` is
 * 'trialing'. No countdown, no red, no "don't miss out" — a warm, factual line
 * with a link to /subscribe.
 */
export function TrialBanner() {
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from("profiles").select("subscription_status, trial_ends_at").eq("id", user.id).maybeSingle();
      setStatus((data?.subscription_status as string | null) ?? null);
      setTrialEndsAt((data?.trial_ends_at as string | null) ?? null);
    });
  }, []);

  if (status !== "trialing" || !trialEndsAt) return null;
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
