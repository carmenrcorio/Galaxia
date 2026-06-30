"use client";

import { useState } from "react";

export function WaitlistForm({ source }: { source: "hero" | "close" }) {
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/early-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source })
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(body.error ?? "Could not join waitlist.");
        return;
      }
      setSuccess(true);
      setEmail("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return <p style={{ color: "var(--gold)" }}>✦ You're on the list. We'll be in touch.</p>;
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
      <input
        aria-label="Email address"
        required
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
        style={{
          minWidth: 240,
          borderRadius: 999,
          border: "1px solid var(--line)",
          background: "var(--ink2)",
          color: "var(--cream)",
          padding: "12px 16px"
        }}
      />
      <button
        type="submit"
        disabled={submitting}
        style={{
          borderRadius: 999,
          border: "none",
          cursor: "pointer",
          background: "var(--gold)",
          color: "var(--ink)",
          fontWeight: 700,
          padding: "12px 18px"
        }}
      >
        Request early access
      </button>
      {error ? <p style={{ color: "var(--rose)", margin: 0 }}>{error}</p> : null}
    </form>
  );
}
