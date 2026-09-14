"use client";

import { useState } from "react";
import {
  SHARE_ANON_EXPIRY_NOTE,
  SHARE_COMPARE_DISCLOSURE,
  SHARE_DEFAULT_EXPIRY_DAYS,
  SHARE_EXPIRY_OPTIONS,
  SHARE_GIFT_DISCLOSURE,
  SHARE_SIGNED_IN_REVOKE_NOTE,
} from "../lib/quick-share";
import { useViewer } from "../lib/use-viewer";

/**
 * "Copy share link" — asks the caller for a URL (usually after POSTing the
 * computed reading to /api/quick-share), then copies it. The copied string
 * must be a /s/<token> URL with no birth params and no name.
 */
export function ShareLinkButton({
  createShareUrl,
  variant = "compare",
}: {
  createShareUrl: (opts: { expiresInDays: number | null }) => Promise<string>;
  /** Gift natal charts get the stronger birth-data disclosure. */
  variant?: "gift" | "compare";
}) {
  const viewer = useViewer();
  const signedIn = Boolean(viewer.userId);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expiresInDays, setExpiresInDays] = useState<number | null>(SHARE_DEFAULT_EXPIRY_DAYS);

  const options = signedIn
    ? SHARE_EXPIRY_OPTIONS
    : SHARE_EXPIRY_OPTIONS.filter((option) => option.days !== null);

  async function copy() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const days = signedIn ? expiresInDays : expiresInDays ?? SHARE_DEFAULT_EXPIRY_DAYS;
      const url = await createShareUrl({ expiresInDays: days });
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      // FOUNDER-REVIEW: authored — share persist / clipboard failure.
      setError(err instanceof Error ? err.message : "Could not copy a share link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 8, justifyItems: "center", maxWidth: 420, margin: "0 auto" }}>
      <p className="muted" style={{ fontSize: ".76rem", lineHeight: 1.55, textAlign: "center", margin: 0 }}>
        {/* FOUNDER-REVIEW: SHARE_GIFT_DISCLOSURE / SHARE_COMPARE_DISCLOSURE */}
        {variant === "gift" ? SHARE_GIFT_DISCLOSURE : SHARE_COMPARE_DISCLOSURE}
      </p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
        {options.map((option) => {
          const selected = expiresInDays === option.days;
          return (
            <button
              key={String(option.days)}
              type="button"
              className="pill-link"
              onClick={() => setExpiresInDays(option.days)}
              aria-pressed={selected}
              style={{
                fontSize: ".72rem",
                padding: "4px 10px",
                borderColor: selected ? "rgba(230,174,108,.5)" : undefined,
                color: selected ? "var(--gold)" : undefined,
              }}
            >
              {/* FOUNDER-REVIEW: SHARE_EXPIRY_OPTIONS labels */}
              {option.label}
            </button>
          );
        })}
      </div>
      <p className="muted" style={{ fontSize: ".72rem", lineHeight: 1.5, textAlign: "center", margin: 0 }}>
        {/* FOUNDER-REVIEW: SHARE_ANON_EXPIRY_NOTE / SHARE_SIGNED_IN_REVOKE_NOTE */}
        {signedIn ? SHARE_SIGNED_IN_REVOKE_NOTE : SHARE_ANON_EXPIRY_NOTE}
      </p>
      <button type="button" className="pill-link" onClick={() => void copy()} disabled={busy}>
        {busy ? "Creating link…" : copied ? "✦ Link copied" : "Copy share link"}
      </button>
      {error ? <p className="error" style={{ fontSize: ".78rem", margin: 0 }}>{error}</p> : null}
    </div>
  );
}
