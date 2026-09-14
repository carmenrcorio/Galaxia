"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Spinner } from "./spinner";
import { createSupabaseBrowserClient } from "../lib/supabase/client";
import { EMAIL_PATHS, SETTINGS_CANCEL_HREF } from "../lib/nav-links";
import {
  SETTINGS_SUBSCRIPTION_COPY,
  deriveSettingsSubscriptionView,
  errorMessageForReason,
  loadSettingsSubscription,
  type SettingsSubscriptionLoadResult,
  type SubscriptionProfileRow
} from "../lib/settings-subscription";

const PROFILE_SELECT =
  "subscription_status, trial_ends_at, current_period_end, cancel_at_period_end, comped, plan";

export function SettingsSubscriptionPanel() {
  const [load, setLoad] = useState<SettingsSubscriptionLoadResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();
    void loadSettingsSubscription({
      getUser: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        return { user: user ? { id: user.id } : null };
      },
      getProfile: async (userId) => {
        const { data, error } = await supabase
          .from("profiles")
          .select(PROFILE_SELECT)
          .eq("id", userId)
          .maybeSingle();
        return {
          data: (data as SubscriptionProfileRow | null) ?? null,
          error: error ? { message: error.message } : null
        };
      }
    }).then((result) => {
      if (!cancelled) setLoad(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!load) {
    return (
      <section className="glass-card" aria-busy="true" aria-live="polite">
        <h2 className="card-title">Subscription</h2>
        <p className="muted" style={{ margin: 0, lineHeight: 1.6, display: "flex", alignItems: "center", gap: 8 }}>
          <Spinner size={12} />
          {SETTINGS_SUBSCRIPTION_COPY.checking}
        </p>
      </section>
    );
  }

  if (load.kind === "error") {
    const message = errorMessageForReason(load.reason);
    return (
      <section className="glass-card" aria-live="polite">
        <h2 className="card-title">Subscription</h2>
        <p className="error" style={{ margin: 0, lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
          <a className="pill-link" href={SETTINGS_SUBSCRIPTION_COPY.manageBillingHref}>
            {SETTINGS_SUBSCRIPTION_COPY.manageBillingLabel}
          </a>
        </div>
      </section>
    );
  }

  const view = deriveSettingsSubscriptionView(load.snapshot);

  return (
    <section className="glass-card">
      <h2 className="card-title">Subscription</h2>
      <p style={{ margin: "0 0 4px", color: "var(--cream)", fontWeight: 600, fontSize: ".95rem" }}>
        {view.planName}
      </p>
      <p className="muted" style={{ margin: 0, lineHeight: 1.6 }}>{view.headline}</p>
      {view.details.map((line) => (
        <p key={line} className="muted" style={{ margin: "8px 0 0", lineHeight: 1.6, fontSize: ".78rem" }}>
          {line}
        </p>
      ))}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
        {view.canCancel ? (
          <Link className="btn-primary" href={SETTINGS_CANCEL_HREF as never}>
            {SETTINGS_SUBSCRIPTION_COPY.cancelLabel}
          </Link>
        ) : null}
        {view.showSubscribe ? (
          <Link className="pill-link" href={EMAIL_PATHS.subscribe as never}>{SETTINGS_SUBSCRIPTION_COPY.subscribeLabel}</Link>
        ) : null}
        {view.showManageBilling ? (
          <a className="pill-link" href={view.manageBillingHref}>
            {view.manageBillingLabel}
          </a>
        ) : null}
      </div>
    </section>
  );
}
