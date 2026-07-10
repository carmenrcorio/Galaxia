"use client";

import { useState } from "react";

export function ShareLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — silently no-op */
    }
  }
  return (
    <button type="button" className="pill-link" onClick={copy}>
      {copied ? "✦ Link copied" : "Copy share link"}
    </button>
  );
}
