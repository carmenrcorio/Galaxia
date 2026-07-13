"use client";

import { trialDaysRemaining } from "@galaxia/core";
import {
  ErrorCode,
  Purchases,
  PurchasesError,
  type Package
} from "@revenuecat/purchases-js";
import { useState } from "react";
import { publicEnv } from "../lib/env";
import { RC_ENTITLEMENT_ID } from "../lib/revenuecat";
import { createSupabaseBrowserClient } from "../lib/supabase/client";
import { Spinner } from "./spinner";

/**
 * The paywall. Copy for the genuinely-trial-ended state is verbatim from
 * design/galaxia-pricing-copy.md §1.
 *
 * Billing (RevenueCat Web Billing): the purchase is driven client-side by the
 * RevenueCat Web SDK. We launch MONTHLY-ONLY — annual/lifetime are not set up in
 * RevenueCat yet, so they are not offered here. Payment status is NEVER set by
 * this component; the RevenueCat webhook is the single source of truth and flips
 * profiles.subscription_status. After a successful purchase we only READ the
 * profile to know when the webhook has landed, then send the user into the app.
 *
 * Header copy is derived from the real subscriptionStatus/trialEndsAt passed in
 * from the server component — never asserted. An unrecognized/missing status
 * renders neutral copy that claims nothing, per ENGINEERING.md §12.
 */

const MONTHLY_PLAN = {
  name: "Monthly",
  price: "$9.99",
  unit: "/month"
};

const INCLUDED: { title: string; body: string }[] = [
  { title: "Everyone you love.", body: "No limit on how many people you add. Your grandmother should not cost extra." },
  { title: "Real charts.", body: "Computed from precise astronomical data — placements, houses, angles, aspects, to the degree. Never guessed by an AI." },
  { title: "Vela.", body: "An astrologer and relationship coach who knows both charts and gives you something to actually do." },
  { title: "The generational layer.", body: "See the sky your whole family was born under. Works from just a birth year." },
  { title: "Private by design.", body: "Your notes about someone are yours alone. Always. No two-way AI chat about children." },
];

interface HeaderCopy {
  eyebrow: string | null;
  headline: string;
  body: string;
  showCheckout: boolean;
}

/**
 * The one place that decides what the paywall's header says. Every branch is
 * gated on the real subscriptionStatus/trialEndsAt — none of this is
 * reachable without checking data first, and the fallback for an
 * unrecognized or missing status asserts nothing about the trial.
 */
export function deriveHeaderCopy(subscriptionStatus: string | null, trialEndsAt: string | null): HeaderCopy {
  if (subscriptionStatus === "active" || subscriptionStatus === "lifetime") {
    return {
      eyebrow: "YOUR PLAN",
      headline: "You're already in.",
      body: "You're subscribed — thank you. There's nothing more to unlock here; manage your plan from your account.",
      showCheckout: false,
    };
  }

  if (subscriptionStatus === "trialing") {
    const daysLeft = trialDaysRemaining(trialEndsAt);
    if (trialEndsAt && daysLeft > 0) {
      return {
        eyebrow: `${daysLeft} ${daysLeft === 1 ? "DAY" : "DAYS"} LEFT IN YOUR TRIAL`,
        headline: "Keep your galaxy.",
        body: "Nothing here is locked — this is the whole product. Continue now, or keep exploring until your trial ends; nothing is charged until you choose to.",
        showCheckout: true,
      };
    }
    // trialEndsAt missing or in the past — the trial has genuinely ended.
    // This is the only state the original approved copy describes.
    return {
      eyebrow: "YOUR TRIAL HAS ENDED",
      headline: "Keep your galaxy.",
      body: "Everything you've built is still here — every chart, every note, every constellation you named. Continue whenever you're ready.",
      showCheckout: true,
    };
  }

  if (subscriptionStatus === "canceled" || subscriptionStatus === "past_due") {
    // They were a subscriber; this isn't a trial ending, it's a lapsed
    // subscription. Same underlying promise (nothing was deleted), different
    // premise, so the "trial ended" eyebrow would be a specific wrong claim.
    return {
      eyebrow: "PICK UP WHERE YOU LEFT OFF",
      headline: "Keep your galaxy.",
      body: "Everything you've built is still here — every chart, every note, every constellation you named. Continue whenever you're ready.",
      showCheckout: true,
    };
  }

  // Unknown or missing status (e.g. a brand-new account whose profile row is
  // still settling). Say nothing about trial state rather than assert one.
  return {
    eyebrow: null,
    headline: "Keep your galaxy.",
    body: "Nothing here is locked. This is the whole product.",
    showCheckout: true,
  };
}

/**
 * Poll the user's profile until the webhook has flipped their status to a state
 * with access. Read-only — the client never writes status. Bounded so we never
 * hang; if it doesn't land in time the caller falls back to a manual link.
 */
async function waitForAccess(userId: string, attempts = 12, delayMs = 1500): Promise<boolean> {
  const supabase = createSupabaseBrowserClient();
  for (let i = 0; i < attempts; i++) {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("subscription_status")
        .eq("id", userId)
        .maybeSingle();
      const status = (data?.subscription_status as string | null) ?? null;
      if (status === "active" || status === "lifetime") return true;
    } catch {
      // Ignore transient read errors and keep polling.
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return false;
}

export function Paywall({
  userId = null,
  subscriptionStatus = null,
  trialEndsAt = null,
}: {
  userId?: string | null;
  subscriptionStatus?: string | null;
  trialEndsAt?: string | null;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [purchased, setPurchased] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = deriveHeaderCopy(subscriptionStatus, trialEndsAt);

  async function subscribe() {
    setError(null);

    if (!publicEnv.revenueCatPublicKey) {
      setError("Payments aren't available yet. Please try again later.");
      return;
    }
    if (!userId) {
      setError("Please sign in again to continue.");
      return;
    }

    setSubmitting(true);
    try {
      // Identify the RevenueCat customer by the Supabase user.id so web (and
      // future mobile) map to ONE RevenueCat customer and ONE entitlement.
      if (!Purchases.isConfigured()) {
        Purchases.configure({ apiKey: publicEnv.revenueCatPublicKey, appUserId: userId });
      }

      const offerings = await Purchases.getSharedInstance().getOfferings();
      const monthly: Package | null =
        offerings.current?.monthly ?? offerings.current?.availablePackages?.[0] ?? null;
      if (!monthly) {
        setError("No plan is available right now. Please try again later.");
        return;
      }

      const { customerInfo } = await Purchases.getSharedInstance().purchase({ rcPackage: monthly });

      if (customerInfo.entitlements.active[RC_ENTITLEMENT_ID]) {
        setPurchased(true);
        setSyncing(true);
        // The webhook is the source of truth; wait for it to flip our status,
        // then continue into the app. Fall back to a manual link if it's slow.
        const ready = await waitForAccess(userId);
        setSyncing(false);
        if (ready) {
          window.location.href = "/app";
        }
      } else {
        setError("Your purchase went through but access is still syncing. Refresh in a moment.");
      }
    } catch (e) {
      if (e instanceof PurchasesError && e.errorCode === ErrorCode.UserCancelledError) {
        // User closed the purchase flow — not an error.
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (purchased) {
    return (
      <div className="glass-card" style={{ maxWidth: 520, margin: "0 auto", display: "grid", gap: 14, textAlign: "center" }}>
        <p style={{ color: "var(--gold)", fontFamily: "var(--serif)", fontSize: "1.6rem", margin: 0 }}>✦ You're in.</p>
        <p className="muted" style={{ margin: 0, lineHeight: 1.6 }}>
          Thank you for subscribing. {syncing ? "Setting up your account…" : "Your galaxy is ready."}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", alignItems: "center" }}>
          {syncing ? <Spinner size={14} color="var(--gold)" /> : null}
          <a className="btn-primary" href="/app">Open Galaxia</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", display: "grid", gap: 20 }}>
      <div style={{ textAlign: "center" }}>
        {copy.eyebrow ? <p className="eyebrow">{copy.eyebrow}</p> : null}
        <h1 style={{ fontFamily: "var(--serif)", fontSize: "2.4rem", color: "var(--cream)", margin: "6px 0 12px", lineHeight: 1.1 }}>
          {copy.headline}
        </h1>
        <p className="muted" style={{ fontSize: ".96rem", lineHeight: 1.6, maxWidth: "46ch", margin: "0 auto" }}>
          {copy.body}
        </p>
      </div>

      {!copy.showCheckout ? (
        <div style={{ textAlign: "center" }}>
          <a className="btn-primary" href="/account">Manage my subscription</a>
        </div>
      ) : (
      <>
      {/* Single monthly plan — annual/lifetime aren't set up yet, so aren't offered. */}
      <div className="glass-card" style={{
        textAlign: "left", padding: "16px 18px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        border: "1px solid var(--gold)", background: "rgba(230,174,108,.07)",
      }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: "1.1rem", color: "var(--cream)" }}>{MONTHLY_PLAN.name}</div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <span style={{ fontFamily: "var(--serif)", fontSize: "1.5rem", color: "var(--cream)", fontWeight: 600 }}>{MONTHLY_PLAN.price}</span>
          <span className="muted" style={{ fontSize: ".8rem" }}> {MONTHLY_PLAN.unit}</span>
        </div>
      </div>

      <div style={{ textAlign: "center" }}>
        <button className="btn-primary" onClick={() => void subscribe()} disabled={submitting} style={{ gap: 8, minWidth: 240 }}>
          {submitting && <Spinner size={13} color="#1a1206" />}
          {submitting ? "One moment…" : "Continue with Galaxia"}
        </button>
        <p className="muted" style={{ fontSize: ".78rem", marginTop: 10, color: "var(--mist2)" }}>
          Cancel in one click, any time. We'll email you before we ever charge you again.
        </p>
        {error ? <p className="error" style={{ fontSize: ".8rem", marginTop: 8 }}>{error}</p> : null}
      </div>

      {/* What's included — no tiers, no comparison table, no asterisks */}
      <div className="glass-card" style={{ display: "grid", gap: 12 }}>
        {INCLUDED.map((item) => (
          <div key={item.title} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ color: "var(--gold)", flexShrink: 0, marginTop: 2 }}>✦</span>
            <p style={{ margin: 0, fontSize: ".88rem", lineHeight: 1.55, color: "var(--mist)" }}>
              <strong style={{ color: "var(--cream)", fontWeight: 600 }}>{item.title}</strong> {item.body}
            </p>
          </div>
        ))}
      </div>
      </>
      )}
    </div>
  );
}
