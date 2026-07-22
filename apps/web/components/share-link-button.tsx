"use client";

import { useState } from "react";

/**
 * "Copy share link" — asks the caller for a URL (usually after POSTing the
 * computed reading to /api/quick-share), then copies it. The copied string
 * must be a /s/<token> URL with no birth params.
 */
export function ShareLinkButton({
  createShareUrl,
}: {
  createShareUrl: () => Promise<string>;
}) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function copy() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const url = await createShareUrl();
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
    <div style={{ display: "grid", gap: 6, justifyItems: "center" }}>
      <button type="button" className="pill-link" onClick={copy} disabled={busy}>
        {busy ? "Creating link…" : copied ? "✦ Link copied" : "Copy share link"}
      </button>
      {error ? <p className="error" style={{ fontSize: ".78rem", margin: 0 }}>{error}</p> : null}
    </div>
  );
}
