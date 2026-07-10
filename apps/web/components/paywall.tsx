"use client";

import { trialDaysRemaining } from "@galaxia/core";
import { useState } from "react";
import { publicEnv } from "../lib/env";
import { Spinner } from "./spinner";

/**
 * The paywall. Copy for the genuinely-trial-ended state is verbatim from
 * design/galaxia-pricing-copy.md §1 (and §2 for the founding-member block).
 * Do not paraphrase that one.
 *
 * BUG (fixed here): this component used to render "YOUR TRIAL HAS ENDED"
 * unconditionally, regardless of subscription_status/trial_ends_at. The spec
 * only ever describes this page as "shown at trial end" — it never
 * anticipated someone reaching it mid-trial, subscribed, or previously
 * canceled, but the app lets all of those happen (direct navigation, an old
 * link, /account's "Subscribe" pill for a canceled account). The header copy
 * below is now derived from the real subscriptionStatus/trialEndsAt passed
 * in from the server component — never asserted. An unrecognized/missing
 * status renders neutral copy that claims nothing, per ENGINEERING.md §12.
 *
 * Card-optional trial (Amendment 1): the card is collected here, at trial end
 * or when the user chooses to subscribe — never at signup.
 * Founding members capped at 300 (Amendment 2); the count is read from the DB.
 */

const PLANS = [
  {
    id: "annual" as const,
    name: "Yearly",
    badge: "Best value",
    price: "$89",
    unit: "/year",
    sub: "$7.42 a month · save 26%",
  },
  {
    id: "monthly" as const,
    name: "Monthly",
    badge: null,
    price: "$9.99",
    unit: "/month",
    sub: null,
  },
];

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

export function Paywall({
  foundingRemaining,
  subscriptionStatus = null,
  trialEndsAt = null,
}: {
  foundingRemaining?: number | null;
  subscriptionStatus?: string | null;
  trialEndsAt?: string | null;
}) {
  const [selected, setSelected] = useState<"annual" | "monthly">("annual"); // annual pre-selected
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const foundingEnabled = publicEnv.foundingEnabled && subscriptionStatus !== "lifetime";
  const copy = deriveHeaderCopy(subscriptionStatus, trialEndsAt);

  async function checkout(plan: "annual" | "monthly" | "lifetime") {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (res.ok) {
        const { url } = (await res.json()) as { url?: string };
        if (url) { window.location.href = url; return; }
      }
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong. Please try again.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
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
      {/* Price cards — annual pre-selected, marked Best value */}
      <div style={{ display: "grid", gap: 10 }}>
        {PLANS.map((plan) => {
          const active = selected === plan.id;
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelected(plan.id)}
              aria-pressed={active}
              className="glass-card"
              style={{
                textAlign: "left", cursor: "pointer", padding: "16px 18px",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                border: active ? "1px solid var(--gold)" : "1px solid rgba(183,154,216,.16)",
                background: active ? "rgba(230,174,108,.07)" : "rgba(255,255,255,.02)",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "var(--serif)", fontSize: "1.1rem", color: "var(--cream)" }}>{plan.name}</span>
                  {plan.badge ? (
                    <span style={{ fontSize: ".64rem", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#1a1206", background: "var(--gold)", borderRadius: 100, padding: "2px 8px" }}>
                      {plan.badge}
                    </span>
                  ) : null}
                </div>
                {plan.sub ? <div className="muted" style={{ fontSize: ".8rem", marginTop: 2 }}>{plan.sub}</div> : null}
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <span style={{ fontFamily: "var(--serif)", fontSize: "1.5rem", color: "var(--cream)", fontWeight: 600 }}>{plan.price}</span>
                <span className="muted" style={{ fontSize: ".8rem" }}> {plan.unit}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ textAlign: "center" }}>
        <button className="btn-primary" onClick={() => checkout(selected)} disabled={submitting} style={{ gap: 8, minWidth: 240 }}>
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

      {/* Founding member offer (optional, behind flag). Cap 300 (Amendment 2). Real count only. */}
      {foundingEnabled ? (
        <div className="glass-card" style={{ textAlign: "center", display: "grid", gap: 8, border: "1px solid rgba(230,174,108,.28)" }}>
          <p className="eyebrow">FOUNDING MEMBERS · 300 ONLY</p>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: "1.5rem", color: "var(--cream)", margin: 0 }}>Pay once. Stay forever.</h2>
          <p className="muted" style={{ fontSize: ".88rem", lineHeight: 1.55, maxWidth: "44ch", margin: "0 auto" }}>
            Galaxia is new, and you're early. Three hundred people can buy it outright — one payment, no subscription, for as long as Galaxia exists. You'll shape what it becomes.
          </p>
          <div style={{ fontFamily: "var(--serif)", fontSize: "1.4rem", color: "var(--cream)" }}>$149 once</div>
          <button className="btn-primary" onClick={() => checkout("lifetime")} disabled={submitting} style={{ margin: "4px auto 0", gap: 8 }}>
            Become a founding member
          </button>
          {typeof foundingRemaining === "number" ? (
            <p className="muted" style={{ fontSize: ".78rem" }}>{Math.max(0, 300 - foundingRemaining)} of 300 remaining.</p>
          ) : null}
        </div>
      ) : null}
      </>
      )}
    </div>
  );
}
