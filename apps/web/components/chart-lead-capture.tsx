"use client";

import type { BirthFormInput } from "@galaxia/astro";
import type { ChartLeadSource } from "../lib/chart-lead-upsert";
import { track } from "@vercel/analytics/react";
import { type FormEvent, useEffect, useState } from "react";
import { CHART_LEAD_CONFIRMATION } from "../lib/chart-lead";
import { Spinner } from "./spinner";

// FOUNDER-REVIEW: Galaxia Notes newsletter checkbox label.
export const GALAXIA_NOTES_OPT_IN_LABEL = "Send me Galaxia Notes, about twice a month";

export function ChartLeadCapture({
  chartData,
  source,
}: {
  chartData: BirthFormInput;
  source: ChartLeadSource;
}) {
  const [email, setEmail] = useState("");
  const [galaxiaNotes, setGalaxiaNotes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!dismissed && !confirmation) {
      track("email_prompt_shown", { source });
    }
  }, [confirmation, dismissed, source]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/chart-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          chartData,
          source,
          consentMarketing: galaxiaNotes,
        }),
      });
      const body = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) {
        // FOUNDER-REVIEW: "Your chart could not be saved. Try again."
        setError(body.error ?? "Your chart could not be saved. Try again.");
        return;
      }
      track("email_submitted", { source, newsletter: galaxiaNotes ? "yes" : "no" });
      if (galaxiaNotes) track("newsletter_opt_in", { source });
      setConfirmation(body.message ?? CHART_LEAD_CONFIRMATION);
    } catch {
      // FOUNDER-REVIEW: "The connection dropped. Check it and try again."
      setError("The connection dropped. Check it and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function dismiss() {
    track("email_dismissed", { source });
    setDismissed(true);
  }

  if (dismissed) return null;

  return (
    <section
      className="glass-card fade-in fade-in-delay-1"
      style={{ marginTop: 16 }}
      aria-label="Save chart by email"
    >
      {confirmation ? (
        <p role="status" style={{ color: "var(--teal)", margin: 0, lineHeight: 1.6 }}>
          {confirmation}
        </p>
      ) : (
        <>
          {/* FOUNDER-REVIEW: "Save this chart and get it by email" */}
          <h2 style={{ color: "var(--cream)", fontFamily: "var(--serif)", fontSize: "1.2rem", margin: "0 0 6px" }}>
            Save this chart and get it by email
          </h2>
          {/* FOUNDER-REVIEW: promise line */}
          <p className="muted" style={{ fontSize: ".84rem", margin: "0 0 14px", lineHeight: 1.6 }}>
            We will send this chart to your inbox and note when a transit matters for it. You can unsubscribe anytime.
          </p>
          <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
              <label style={{ flex: "1 1 220px" }}>
                {/* FOUNDER-REVIEW: "Email address" */}
                <span className="sr-only">Email address</span>
                {/* FOUNDER-REVIEW: "you@example.com" */}
                <input
                  className="field"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  disabled={submitting}
                  style={{ width: "100%", borderRadius: 14 }}
                />
              </label>
              <button className="btn-primary" type="submit" disabled={submitting} style={{ gap: 8 }}>
                {submitting ? <Spinner size={13} color="#1a1206" /> : null}
                {/* FOUNDER-REVIEW: "Saving…" / "Email my chart" */}
                {submitting ? "Saving…" : "Email my chart"}
              </button>
            </div>
            <label className="helper-text helper-text--soft" style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <input
                type="checkbox"
                checked={galaxiaNotes}
                onChange={(event) => setGalaxiaNotes(event.target.checked)}
                disabled={submitting}
                style={{ marginTop: 3 }}
              />
              <span>{GALAXIA_NOTES_OPT_IN_LABEL}</span>
            </label>
          </form>
          <button type="button" className="pill-link" style={{ fontSize: ".78rem", marginTop: 10 }} onClick={dismiss}>
            {/* FOUNDER-REVIEW: "No thanks, keep exploring" */}
            No thanks, keep exploring
          </button>
          {error ? <p role="alert" className="error" style={{ fontSize: ".8rem", margin: "10px 0 0" }}>{error}</p> : null}
        </>
      )}
    </section>
  );
}
