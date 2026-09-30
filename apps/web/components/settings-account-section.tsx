"use client";

/**
 * Settings -> Account. Two irreversible-adjacent controls in one place:
 * take your data with you, or close the account.
 *
 * Both call the same API routes the /account/data page uses. Delete runs
 * purge_own_account_data server side, then signs out and lands on the
 * homepage; a failed purge deletes nothing and keeps the session.
 */

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ACCOUNT_DELETE_COPY,
  ACCOUNT_EXPORT_COPY,
  ACCOUNT_SECTION_COPY,
  shouldWarnBillingOnDelete
} from "../lib/account-data";
import { clearShownSharedTransits } from "../lib/this-week-seen";
import { createSupabaseBrowserClient } from "../lib/supabase/client";
import { AccountDeleteDialog } from "./account-delete-dialog";
import { Spinner } from "./spinner";

export function SettingsAccountSection({
  subscriptionStatus
}: {
  subscriptionStatus: string | null;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const showBillingWarning = shouldWarnBillingOnDelete(subscriptionStatus);

  async function downloadExport() {
    setExporting(true);
    setExportError(null);
    try {
      const res = await fetch("/api/account/export", { method: "GET" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setExportError(body.error ?? ACCOUNT_EXPORT_COPY.errorGeneric);
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? "galaxia-export.json";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setExportError(ACCOUNT_EXPORT_COPY.errorGeneric);
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount(confirmation: string, password: string) {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation, password })
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setDeleteError(body.error ?? ACCOUNT_DELETE_COPY.errorGeneric);
        setDeleting(false);
        return;
      }
      // The login row is already gone, so this only clears the local session.
      await supabase.auth.signOut().catch(() => undefined);
      clearShownSharedTransits();
      window.location.href = "/";
    } catch {
      setDeleteError(ACCOUNT_DELETE_COPY.errorGeneric);
      setDeleting(false);
    }
  }

  return (
    <section className="glass-card">
      <h2 className="card-title">{ACCOUNT_SECTION_COPY.title}</h2>
      <p className="muted" style={{ marginBottom: 12 }}>{ACCOUNT_SECTION_COPY.lead}</p>

      <div style={{ display: "grid", gap: 8, marginBottom: 18 }}>
        <button
          type="button"
          className="pill-link"
          style={{ width: "fit-content", cursor: "pointer", gap: 8 }}
          onClick={() => void downloadExport()}
          disabled={exporting}
        >
          {exporting && <Spinner size={11} />}
          {exporting ? ACCOUNT_SECTION_COPY.exportBusy : ACCOUNT_SECTION_COPY.exportButton}
        </button>
        <p className="muted" style={{ fontSize: ".78rem", margin: 0 }}>
          {ACCOUNT_SECTION_COPY.exportHelp}
        </p>
        {exportError ? (
          <p className="error" role="alert" style={{ fontSize: ".78rem", margin: 0 }}>
            {exportError}
          </p>
        ) : null}
      </div>

      {showBillingWarning ? (
        <div
          style={{
            border: "1px solid rgba(230,174,108,.35)",
            background: "rgba(230,174,108,.08)",
            borderRadius: 12,
            padding: 14,
            display: "grid",
            gap: 8,
            marginBottom: 14
          }}
        >
          <p style={{ color: "var(--cream)", margin: 0, lineHeight: 1.55, fontSize: ".85rem" }}>
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
        <p className="error" role="alert" style={{ fontSize: ".78rem", marginTop: 8 }}>
          {deleteError}
        </p>
      ) : null}

      <AccountDeleteDialog
        open={dialogOpen}
        deleting={deleting}
        error={deleteError}
        onCancel={() => {
          setDialogOpen(false);
          setDeleteError(null);
        }}
        onConfirm={(confirmation, password) => void deleteAccount(confirmation, password)}
      />
    </section>
  );
}
