"use client";

import type { BirthFormInput } from "@galaxia/astro";
import { type FormEvent, useState } from "react";
import { CHART_LEAD_CONFIRMATION } from "../lib/chart-lead";
import { Spinner } from "./spinner";

export function ChartLeadCapture({ chartData }: { chartData: BirthFormInput }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/chart-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, chartData }),
      });
      const body = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) {
        // FOUNDER-REVIEW: "Your alerts could not be saved. Try again."
        setError(body.error ?? "Your alerts could not be saved. Try again.");
        return;
      }
      setConfirmation(body.message ?? CHART_LEAD_CONFIRMATION);
    } catch {
      // FOUNDER-REVIEW: "The connection dropped. Check it and try again."
      setError("The connection dropped. Check it and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="glass-card fade-in fade-in-delay-1" style={{ marginTop: 16 }}>
      {confirmation ? (
        <p role="status" style={{ color: "var(--teal)", margin: 0, lineHeight: 1.6 }}>
          {confirmation}
        </p>
      ) : (
        <>
          {/* FOUNDER-REVIEW: "Get transit alerts for this chart" */}
          <h2 style={{ color: "var(--cream)", fontFamily: "var(--serif)", fontSize: "1.2rem", margin: "0 0 6px" }}>
            Get transit alerts for this chart
          </h2>
          {/* FOUNDER-REVIEW: "We will send you a note when the sky hits this chart in a way that matters. No spam. No horoscopes. Just the transits that actually apply." */}
          <p className="muted" style={{ fontSize: ".84rem", margin: "0 0 14px", lineHeight: 1.6 }}>
            We will send you a note when the sky hits this chart in a way that matters. No spam. No horoscopes. Just the transits that actually apply.
          </p>
          <form onSubmit={submit} style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
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
              {/* FOUNDER-REVIEW: "Saving…" / "Send me alerts" */}
              {submitting ? "Saving…" : "Send me alerts"}
            </button>
          </form>
          {error ? <p role="alert" className="error" style={{ fontSize: ".8rem", margin: "10px 0 0" }}>{error}</p> : null}
        </>
      )}
    </section>
  );
}
