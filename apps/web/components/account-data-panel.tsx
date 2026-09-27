"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ACCOUNT_DELETE_COPY,
  ACCOUNT_EXPORT_COPY,
  ACCOUNT_SECTION_COPY,
  shouldWarnBillingOnDelete
} from "../lib/account-data";
import { createSupabaseBrowserClient } from "../lib/supabase/client";
import { AccountDeleteDialog } from "./account-delete-dialog";
import { Spinner } from "./spinner";

export function AccountDataPanel({
  email,
  subscriptionStatus
}: {
  email: string | null;
  subscriptionStatus: string | null;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const showBillingWarning = shouldWarnBillingOnDelete(subscriptionStatus);

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function downloadExport() {
    setExporting(true);
    setExportError(null);
    try {
      const res = await fetch("/api/account/export", { method: "GET" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setExportError((body as { error?: string }).error ?? ACCOUNT_EXPORT_COPY.errorGeneric);
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = /filename="([^"]+)"/.exec(disposition);
      const filename = match?.[1] ?? "galaxia-export.json";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setExportError(ACCOUNT_EXPORT_COPY.errorGeneric);
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount(confirmation: string) {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setDeleteError((body as { error?: string }).error ?? ACCOUNT_DELETE_COPY.errorGeneric);
        setDeleting(false);
        return;
      }
      // The login row is already gone, so this only clears the local session.
      await supabase.auth.signOut().catch(() => undefined);
      window.location.href = "/";
    } catch {
      setDeleteError(ACCOUNT_DELETE_COPY.errorGeneric);
      setDeleting(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={card}>
                <h2 style={{ marginTop: 0 }}>{ACCOUNT_EXPORT_COPY.title}</h2>
        <p style={{ color: "var(--mist)", lineHeight: 1.6 }}>{ACCOUNT_EXPORT_COPY.lead}</p>
        {email ? (
          <p style={{ color: "var(--gold-soft)", fontSize: 14 }}>Account: {email}</p>
        ) : null}
        <button
          type="button"
          className="btn-primary"
          onClick={() => void downloadExport()}
          disabled={exporting}
          style={{ gap: 8, width: "fit-content" }}
        >
          {exporting && <Spinner size={13} color="#1a1206" />}
          {exporting ? "Preparing…" : ACCOUNT_EXPORT_COPY.button}
        </button>
        {exportError ? <p className="error" style={{ fontSize: 13 }}>{exportError}</p> : null}
      </section>

      <section style={card}>
                <h2 style={{ marginTop: 0 }}>{ACCOUNT_DELETE_COPY.title}</h2>
        <p style={{ color: "var(--mist)", lineHeight: 1.6 }}>{ACCOUNT_DELETE_COPY.lead}</p>
        <p style={{ color: "var(--mist)", lineHeight: 1.6 }}>{ACCOUNT_DELETE_COPY.irreversible}</p>
        <p style={{ color: "var(--mist)", lineHeight: 1.6, fontSize: 14 }}>
          {ACCOUNT_DELETE_COPY.shareHonesty}
        </p>

        {showBillingWarning ? (
          <div
            style={{
              border: "1px solid rgba(230,174,108,.35)",
              background: "rgba(230,174,108,.08)",
              borderRadius: 12,
              padding: 14,
              display: "grid",
              gap: 8
            }}
          >
            <p style={{ color: "var(--cream)", margin: 0, lineHeight: 1.55 }}>
              {ACCOUNT_DELETE_COPY.billingWarning}
            </p>
            <Link href="/account/cancel" className="pill-link" style={{ width: "fit-content" }}>
              {ACCOUNT_DELETE_COPY.billingLinkLabel}
            </Link>
          </div>
        ) : null}

        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => {
            setDeleteError(null);
            setDialogOpen(true);
          }}
          style={{
            width: "fit-content",
            cursor: "pointer",
            borderRadius: 999,
            padding: "10px 18px",
            fontWeight: 600,
            color: "var(--rose)",
            background: "rgba(218,140,140,.12)",
            border: "1px solid rgba(218,140,140,.55)"
          }}
        >
          {ACCOUNT_SECTION_COPY.deleteButton}
        </button>
        {deleteError && !dialogOpen ? (
          <p className="error" style={{ fontSize: 13 }}>{deleteError}</p>
        ) : null}
      </section>

      <AccountDeleteDialog
        open={dialogOpen}
        deleting={deleting}
        error={deleteError}
        onCancel={() => {
          setDialogOpen(false);
          setDeleteError(null);
        }}
        onConfirm={(confirmation) => void deleteAccount(confirmation)}
      />
    </div>
  );
}

const card = {
  marginTop: 0,
  border: "1px solid var(--line)",
  background: "var(--ink2)",
  borderRadius: 16,
  padding: 18,
  display: "grid",
  gap: 12
} as const;
