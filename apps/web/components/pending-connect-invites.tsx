"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CONNECT_EMPTY_PENDING,
  CONNECT_PENDING_TITLE,
  connectInviteTimeRemaining,
  connectRelationLabel,
} from "../lib/connect-invite";
// FOUNDER-REVIEW: pending-list copy lives in lib/connect-invite.ts (CONNECT_PENDING_TITLE, CONNECT_EMPTY_PENDING).
import { createSupabaseBrowserClient } from "../lib/supabase/client";
import { Spinner } from "./spinner";

type PendingInvite = {
  token: string;
  relationship_type: string | null;
  expires_at: string;
  person_id: string | null;
  recipient_name: string;
};

export function PendingConnectInvites() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [rows, setRows] = useState<PendingInvite[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setRows([]);
        return;
      }
      const { data, error: loadError } = await supabase
        .from("invites")
        .select("token, relationship_type, expires_at, person_id")
        .eq("from_user", user.id)
        .eq("kind", "constellation_connect")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (loadError) {
        setError(loadError.message);
        setRows([]);
        return;
      }
      const invites = (data ?? []) as Array<{
        token: string;
        relationship_type: string | null;
        expires_at: string;
        person_id: string | null;
      }>;
      const personIds = invites.map((row) => row.person_id).filter((id): id is string => Boolean(id));
      const names = new Map<string, string>();
      if (personIds.length) {
        const { data: people } = await supabase
          .from("people")
          .select("id, display_name")
          .in("id", personIds);
        for (const person of people ?? []) {
          names.set(person.id as string, person.display_name as string);
        }
      }
      setRows(
        invites.map((row) => ({
          ...row,
          recipient_name: (row.person_id && names.get(row.person_id)) || "New connection",
        })),
      );
    };
    void load();
  }, [supabase]);

  const revoke = async (token: string) => {
    setRevoking(token);
    setError(null);
    setRows((current) => (current ?? []).filter((row) => row.token !== token));
    const { error: rpcError } = await supabase.rpc("revoke_connect_invite", { p_token: token });
    setRevoking(null);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
  };

  return (
    <section className="glass-card" id="pending-connections">
      <h2 className="card-title">{CONNECT_PENDING_TITLE}</h2>
      {rows === null ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Spinner size={12} />
          <p className="muted" style={{ margin: 0, fontSize: ".84rem" }}>
            Loading…
          </p>
        </div>
      ) : rows.length === 0 ? (
        <p className="muted">{CONNECT_EMPTY_PENDING}</p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {rows.map((row) => (
            <div
              key={row.token}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                padding: "8px 0",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <div>
                <span style={{ color: "var(--cream)" }}>{row.recipient_name}</span>
                <span className="muted" style={{ fontSize: 13, marginLeft: 8 }}>
                  {connectRelationLabel(row.relationship_type)}
                  {" · "}
                  {connectInviteTimeRemaining(row.expires_at)}
                </span>
              </div>
              <button
                type="button"
                className="pill-link"
                onClick={() => void revoke(row.token)}
                disabled={revoking === row.token}
                style={{ flexShrink: 0, fontSize: ".8rem" }}
                aria-label={`Revoke invite for ${row.recipient_name}`}
              >
                {revoking === row.token ? "Revoking…" : "Revoke"}
              </button>
            </div>
          ))}
        </div>
      )}
      {error ? <p className="error" style={{ fontSize: ".78rem", marginTop: 8 }}>{error}</p> : null}
    </section>
  );
}
