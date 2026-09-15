"use client";

import { useEffect, useState } from "react";
import {
  ASK_BIRTH_DATA_CREATING,
  ASK_BIRTH_DATA_REUSED,
  ASK_BIRTH_DATA_SHARE,
  canCreateBirthDataInvite,
  type MinorSafetyInput
} from "@galaxia/core";
import { publicEnv } from "../lib/env";
import {
  askBirthDataAskCopy,
  askBirthDataSendCopy,
  ensureBirthDataInvite
} from "../lib/ensure-birth-data-invite";
import { createSupabaseBrowserClient } from "../lib/supabase/client";
import { Spinner } from "./spinner";

/**
 * Creates a birth_data invite for a pending person and shows a shareable link.
 * The recipient fills in their own birth details at /invite/[token], the
 * hardest data to get (someone else's birth time) becomes their 30 seconds.
 */
export function AskBirthData({
  personId,
  personName,
  userId,
  autoCreate = false,
  isMinor,
  birthDate,
  birthPrecision
}: {
  personId: string;
  personName: string;
  userId: string;
  /** When true, mint (or reuse) the link as soon as this mounts. */
  autoCreate?: boolean;
  isMinor?: boolean | null;
  birthDate?: string | null;
  birthPrecision?: MinorSafetyInput["birthPrecision"];
}) {
  const supabase = createSupabaseBrowserClient();
  const person: MinorSafetyInput = { isMinor, birthDate, birthPrecision };
  const blocked = !canCreateBirthDataInvite(person);

  const [creating, setCreating] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [reused, setReused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [refused, setRefused] = useState(blocked);

  const canNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  useEffect(() => {
    if (!userId || !personId || blocked) return;
    let cancelled = false;
    const run = async () => {
      if (autoCreate) setCreating(true);
      setError(null);
      try {
        const origin = publicEnv.siteUrl || (typeof window !== "undefined" ? window.location.origin : "");
        const result = await ensureBirthDataInvite(supabase, {
          userId,
          personId,
          person,
          siteOrigin: origin,
          createIfMissing: autoCreate
        });
        if (cancelled) return;
        if (result.status === "refused") {
          setRefused(true);
          return;
        }
        if (result.status === "idle") return;
        setLink(result.url);
        setReused(result.reused);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to create a link.");
      } finally {
        if (!cancelled) setCreating(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
    // person is a new object each render; depend on the primitives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, personId, autoCreate, blocked, isMinor, birthDate, birthPrecision]);

  async function createLink() {
    if (!userId) { setError("Please sign in first."); return; }
    setCreating(true); setError(null);
    try {
      const origin = publicEnv.siteUrl || (typeof window !== "undefined" ? window.location.origin : "");
      const result = await ensureBirthDataInvite(supabase, {
        userId,
        personId,
        person,
        siteOrigin: origin,
        createIfMissing: true
      });
      if (result.status === "refused") {
        setRefused(true);
        return;
      }
      if (result.status !== "ready") return;
      setLink(result.url);
      setReused(result.reused);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create a link.");
    } finally {
      setCreating(false);
    }
  }

  async function copy() {
    if (!link) return;
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard blocked */ }
  }

  async function share() {
    if (!link) return;
    if (canNativeShare) {
      try {
        await navigator.share({ title: `Birth details for ${personName}`, text: askBirthDataSendCopy(personName), url: link });
        return;
      } catch {
        /* user cancelled or share failed: copy instead */
      }
    }
    await copy();
  }

  if (refused || blocked) return null;

  if (link) {
    return (
      <div style={{ display: "grid", gap: 8 }}>
        <p className="muted" style={{ fontSize: ".8rem", margin: 0 }}>
          {askBirthDataSendCopy(personName)}
        </p>
        {reused ? (
          <p className="muted" style={{ fontSize: ".76rem", margin: 0 }}>
            {ASK_BIRTH_DATA_REUSED}
          </p>
        ) : null}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <input className="field" readOnly value={link} onFocus={e => e.currentTarget.select()} style={{ fontSize: ".78rem" }} />
          <button type="button" className="pill-link" onClick={() => void copy()} style={{ flexShrink: 0 }}>{copied ? "Copied" : "Copy"}</button>
          <button type="button" className="pill-link" onClick={() => void share()} style={{ flexShrink: 0 }}>
            {ASK_BIRTH_DATA_SHARE}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button type="button" className="pill-link" onClick={() => void createLink()} disabled={creating} style={{ gap: 8 }}>
        {creating && <Spinner size={12} />}
        {creating ? ASK_BIRTH_DATA_CREATING : askBirthDataAskCopy(personName)}
      </button>
      {error ? <p className="error" style={{ fontSize: ".76rem", marginTop: 6 }}>{error}</p> : null}
    </div>
  );
}
