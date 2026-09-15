"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_FETCH_TIMEOUT_MS, withTimeout } from "@galaxia/core";
import {
  SHARE_PENDING_EMPTY,
  SHARE_PENDING_ERROR,
  SHARE_PENDING_LOADING,
  SHARE_PENDING_NATAL_FALLBACK,
  SHARE_PENDING_COMPARE_LABEL,
  SHARE_PENDING_TITLE,
  SHARE_REVOKE_LABEL,
  SHARE_REVOKING_LABEL,
  shareInviteTimeRemaining,
  type QuickShareListItem,
} from "../lib/quick-share";
// FOUNDER-REVIEW: pending share-link copy lives in lib/quick-share.ts.
import { Spinner } from "./spinner";

export function PendingShareLinks() {
  const [rows, setRows] = useState<QuickShareListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await withTimeout(fetch("/api/quick-share"), DEFAULT_FETCH_TIMEOUT_MS);
    if (res.status === 401) {
      setRows([]);
      return;
    }
    const body = await res.json() as { shares?: QuickShareListItem[]; error?: string };
    if (!res.ok) {
      setError(body.error ?? SHARE_PENDING_ERROR);
      setRows([]);
      return;
    }
    setRows(body.shares ?? []);
  }, []);

  useEffect(() => {
    void load().catch(() => {
      setError(SHARE_PENDING_ERROR);
      setRows([]);
    });
  }, [load]);

  const revoke = async (token: string) => {
    const snapshot = rows ?? [];
    const removed = snapshot.find((row) => row.token === token);
    setRevoking(token);
    setError(null);
    setRows(snapshot.filter((row) => row.token !== token));
    const res = await fetch(`/api/quick-share/${encodeURIComponent(token)}`, { method: "DELETE" });
    setRevoking(null);
    if (!res.ok) {
      setError(SHARE_PENDING_ERROR);
      if (removed) {
        setRows((current) => {
          const list = current ?? [];
          if (list.some((row) => row.token === token)) return list;
          return [...list, removed];
        });
      }
    }
  };

  return (
    <section className="glass-card" id="share-links">
      <h2 className="card-title">{SHARE_PENDING_TITLE}</h2>
      {rows === null ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Spinner size={12} />
          <p className="muted" style={{ margin: 0, fontSize: ".84rem" }}>
            {SHARE_PENDING_LOADING}
          </p>
        </div>
      ) : rows.length === 0 ? (
        <p className="muted">{SHARE_PENDING_EMPTY}</p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {rows.map((row) => {
            const primary = row.kind === "compare"
              ? SHARE_PENDING_COMPARE_LABEL
              : row.displayDate || SHARE_PENDING_NATAL_FALLBACK;
            const meta: string[] = [];
            if (row.kind === "single" && row.birthPlace) meta.push(row.birthPlace);
            meta.push(shareInviteTimeRemaining(row.expires_at));
            return (
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
                  <span style={{ color: "var(--cream)" }}>{primary}</span>
                  <span className="muted" style={{ fontSize: 13, marginLeft: 8 }}>
                    {meta.join(" · ")}
                  </span>
                </div>
                <button
                  type="button"
                  className="pill-link"
                  onClick={() => void revoke(row.token)}
                  disabled={revoking === row.token}
                  style={{ flexShrink: 0, fontSize: ".8rem" }}
                  aria-label={`Revoke share link for ${primary}`}
                >
                  {revoking === row.token ? SHARE_REVOKING_LABEL : SHARE_REVOKE_LABEL}
                </button>
              </div>
            );
          })}
        </div>
      )}
      {error ? <p className="error" style={{ fontSize: ".78rem", marginTop: 8 }}>{error}</p> : null}
    </section>
  );
}
