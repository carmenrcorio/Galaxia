"use client";

import Link from "next/link";
import { useState } from "react";
import { Spinner } from "./spinner";

/**
 * One screen, one click. Copy verbatim from galaxia-pricing-copy.md §4.
 * No retention offer, no discount, no pause, no survey before the button,
 * no multi-step flow. The optional question appears only AFTER confirmation.
 */
export function CancelSubscription({ periodEndLabel }: { periodEndLabel: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [canceled, setCanceled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);

  async function cancel() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/cancel", { method: "POST" });
      if (res.ok) { setCanceled(true); return; }
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong. Please try again.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (canceled) {
    return (
      <div className="glass-card" style={{ maxWidth: 520, margin: "0 auto", display: "grid", gap: 14 }}>
        <p style={{ color: "var(--gold)", fontFamily: "var(--serif)", fontSize: "1.4rem", margin: 0 }}>✦ Done.</p>
        <p className="muted" style={{ margin: 0, lineHeight: 1.6 }}>
          Your access continues until {periodEndLabel}. Your galaxy stays saved.
        </p>
        {/* Optional, AFTER cancellation — clearly optional */}
        {feedbackSent ? (
          <p className="muted" style={{ fontSize: ".84rem" }}>Thank you — that goes straight to the person who built this.</p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            <label className="muted" style={{ fontSize: ".84rem" }}>
              Would you tell us what was missing? Entirely optional, and it won't affect your cancellation.
            </label>
            <textarea className="field field--rect" rows={2} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
            <button className="pill-link" style={{ width: "fit-content" }} disabled={!feedback.trim()} onClick={() => setFeedbackSent(true)}>
              Send
            </button>
          </div>
        )}
        <Link href="/account" className="pill-link" style={{ width: "fit-content" }}>Back to account</Link>
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ maxWidth: 520, margin: "0 auto", display: "grid", gap: 16 }}>
      <h1 style={{ fontFamily: "var(--serif)", fontSize: "1.8rem", color: "var(--cream)", margin: 0 }}>
        Cancel your subscription?
      </h1>
      <div style={{ display: "grid", gap: 10 }}>
        <p className="muted" style={{ margin: 0, lineHeight: 1.6 }}>
          Your access continues until {periodEndLabel}. After that we won't charge you again.
        </p>
        <p className="muted" style={{ margin: 0, lineHeight: 1.6 }}>
          Your galaxy stays saved. If you come back, everything is where you left it.
        </p>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
        <button className="btn-primary" onClick={cancel} disabled={submitting} style={{ gap: 8 }}>
          {submitting && <Spinner size={13} color="#1a1206" />}
          {submitting ? "Cancelling…" : "Cancel subscription"}
        </button>
        <Link href="/account" style={{ color: "var(--gold-soft)", fontSize: ".9rem" }}>Never mind, keep Galaxia</Link>
      </div>
      {error ? <p className="error" style={{ fontSize: ".82rem" }}>{error}</p> : null}
    </div>
  );
}
