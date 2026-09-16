"use client";

import { useState } from "react";
import { publicEnv } from "../lib/env";
import {
  CONNECT_GENERIC_ERROR,
  CONNECT_INVITE_ACTION,
  CONNECT_LINK_CREATE_FAILED,
  CONNECT_LINK_EXPIRES,
  CONNECT_PENDING_HREF,
  CONNECT_PENDING_TITLE,
  CONNECT_RATE_LIMIT,
  CONNECT_SHARE_TEXT,
  CONNECT_SHARE_TITLE,
  canOfferConnectInvite,
  connectPath,
  connectRelationForPerson,
  isConnectMergeTarget,
  isConnectRateLimitError,
  type ConnectPersonGate,
} from "../lib/connect-invite";
import { createSupabaseBrowserClient } from "../lib/supabase/client";
import { Spinner } from "./spinner";

export function ConnectInviteButton({
  person,
  compact = false,
}: {
  person: ConnectPersonGate & { id: string; display_name: string };
  compact?: boolean;
}) {
  const supabase = createSupabaseBrowserClient();
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);

  if (!canOfferConnectInvite(person)) return null;

  const canNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  const createLink = async () => {
    setBusy(true);
    setError(null);
    setRateLimited(false);
    const merge = isConnectMergeTarget(person);
    const { data, error: rpcError } = await supabase.rpc("create_connect_invite", {
      p_relation: connectRelationForPerson(person.relation),
      p_person_id: merge ? person.id : null,
      p_share_back: false,
    });
    setBusy(false);
    if (rpcError) {
      if (isConnectRateLimitError(rpcError.message)) {
        setRateLimited(true);
        setError(CONNECT_RATE_LIMIT);
        return;
      }
      console.error(rpcError.message);
      setError(CONNECT_GENERIC_ERROR);
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    const token = row?.token as string | undefined;
    if (!token) {
      setError(CONNECT_LINK_CREATE_FAILED);
      return;
    }
    const base = publicEnv.siteUrl || (typeof window !== "undefined" ? window.location.origin : "");
    setLink(`${base}${connectPath(token)}`);
  };

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  };

  const share = async () => {
    if (!link || !canNativeShare) return;
    try {
      await navigator.share({ title: CONNECT_SHARE_TITLE, text: CONNECT_SHARE_TEXT, url: link });
    } catch {
      /* user cancelled */
    }
  };

  if (link) {
    return (
      <div style={{ display: "grid", gap: 8 }}>
        <p className="muted" style={{ fontSize: ".8rem", margin: 0 }}>
          {CONNECT_LINK_EXPIRES}
        </p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <input
            className="field"
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            style={{ fontSize: ".78rem" }}
            aria-label="Invite link"
          />
          <button type="button" className="pill-link" onClick={() => void copy()} style={{ flexShrink: 0 }}>
            {copied ? "Copied" : "Copy"}
          </button>
          {canNativeShare ? (
            <button type="button" className="pill-link" onClick={() => void share()} style={{ flexShrink: 0 }}>
              Share
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        className="pill-link"
        onClick={() => void createLink()}
        disabled={busy}
        style={{ gap: 8, fontSize: compact ? ".82rem" : undefined }}
      >
        {busy ? <Spinner size={12} /> : null}
        {busy ? "Creating link…" : CONNECT_INVITE_ACTION}
      </button>
      {error ? (
        <p className="error" style={{ fontSize: ".76rem", marginTop: 6 }}>
          {error}
          {rateLimited ? (
            <>
              {" "}
              <a href={CONNECT_PENDING_HREF} style={{ color: "var(--gold)" }}>
                {CONNECT_PENDING_TITLE}
              </a>
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
