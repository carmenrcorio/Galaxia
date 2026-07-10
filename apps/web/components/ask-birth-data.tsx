"use client";

import { useState } from "react";
import { publicEnv } from "../lib/env";
import { createSupabaseBrowserClient } from "../lib/supabase/client";
import { Spinner } from "./spinner";

/**
 * Creates a birth_data invite for a pending person and shows a shareable link.
 * The recipient fills in their own birth details at /invite/[token] — the
 * hardest data to get (someone else's birth time) becomes their 30 seconds.
 */
export function AskBirthData({ personId, personName, userId }: { personId: string; personName: string; userId: string }) {
  const supabase = createSupabaseBrowserClient();
  const [creating, setCreating] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function createLink() {
    if (!userId) { setError("Please sign in first."); return; }
    setCreating(true); setError(null);
    const token = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/-/g, "");
    const { error: insErr } = await supabase.from("invites").insert({
      from_user: userId, person_id: personId, kind: "birth_data", token, relationship_type: null
    });
    setCreating(false);
    if (insErr) { setError(insErr.message); return; }
    const base = publicEnv.siteUrl || (typeof window !== "undefined" ? window.location.origin : "");
    setLink(`${base}/invite/${token}`);
  }

  async function copy() {
    if (!link) return;
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard blocked */ }
  }

  if (link) {
    return (
      <div style={{ display: "grid", gap: 8 }}>
        <p className="muted" style={{ fontSize: ".8rem", margin: 0 }}>
          Send this to {personName}. When they fill it in, their chart appears here automatically.
        </p>
        <div style={{ display: "flex", gap: 6 }}>
          <input className="field" readOnly value={link} onFocus={e => e.currentTarget.select()} style={{ fontSize: ".78rem" }} />
          <button type="button" className="pill-link" onClick={copy} style={{ flexShrink: 0 }}>{copied ? "Copied" : "Copy"}</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button type="button" className="pill-link" onClick={createLink} disabled={creating} style={{ gap: 8 }}>
        {creating && <Spinner size={12} />}
        {creating ? "Creating link…" : `Ask ${personName} for their birth details`}
      </button>
      {error ? <p className="error" style={{ fontSize: ".76rem", marginTop: 6 }}>{error}</p> : null}
    </div>
  );
}
