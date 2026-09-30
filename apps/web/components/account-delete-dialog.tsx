"use client";

/**
 * Confirmation modal for account deletion.
 *
 * Shared by Settings and /account/data so there is one confirmation
 * experience and one approved wording. Typing DELETE is what separates this
 * from an accidental tap; the match itself is case-insensitive.
 */

import { useEffect, useId, useRef, useState } from "react";
import {
  ACCOUNT_DELETE_MODAL_COPY,
  DELETE_CONFIRMATION_DISPLAY_WORD,
  isDeleteConfirmation
} from "../lib/account-data";
import { Spinner } from "./spinner";

export function AccountDeleteDialog({
  open,
  deleting,
  error,
  onCancel,
  onConfirm
}: {
  open: boolean;
  deleting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (confirmation: string, password: string) => void;
}) {
  const [typed, setTyped] = useState("");
  const [password, setPassword] = useState("");
  const titleId = useId();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTyped("");
    setPassword("");
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open || deleting) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, deleting, onCancel]);

  if (!open) return null;

  const confirmed = isDeleteConfirmation(typed) && password.length > 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "rgba(10,7,23,.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        overflowY: "auto"
      }}
      onClick={() => {
        if (!deleting) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="glass-card"
        style={{
          maxWidth: 440,
          width: "100%",
          margin: "auto",
          display: "grid",
          gap: 12,
          borderColor: "rgba(218,140,140,.4)"
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="card-title" style={{ margin: 0, color: "var(--rose)" }}>
          {ACCOUNT_DELETE_MODAL_COPY.title}
        </h2>
        <p className="muted" style={{ margin: 0, lineHeight: 1.6 }}>
          {ACCOUNT_DELETE_MODAL_COPY.body}
        </p>

        <label htmlFor={inputId} style={{ color: "var(--mist)", fontSize: 14 }}>
          {ACCOUNT_DELETE_MODAL_COPY.typePrompt}
        </label>
        <input
          id={inputId}
          ref={inputRef}
          className="field field--rect"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          placeholder={DELETE_CONFIRMATION_DISPLAY_WORD}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          disabled={deleting}
        />

        <label htmlFor={`${inputId}-password`} style={{ color: "var(--mist)", fontSize: 14 }}>
          {ACCOUNT_DELETE_MODAL_COPY.passwordPrompt}
        </label>
        <input
          id={`${inputId}-password`}
          className="field field--rect"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          disabled={deleting}
        />

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <button
            type="button"
            onClick={() => onConfirm(typed, password)}
            disabled={!confirmed || deleting}
            style={{
              cursor: !confirmed || deleting ? "not-allowed" : "pointer",
              opacity: !confirmed || deleting ? 0.55 : 1,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              borderRadius: 999,
              padding: "10px 18px",
              fontWeight: 600,
              color: "var(--rose)",
              background: "rgba(218,140,140,.12)",
              border: "1px solid rgba(218,140,140,.55)"
            }}
          >
            {deleting && <Spinner size={12} />}
            {deleting ? ACCOUNT_DELETE_MODAL_COPY.confirmBusy : ACCOUNT_DELETE_MODAL_COPY.confirmButton}
          </button>
          <button type="button" className="pill-link" disabled={deleting} onClick={onCancel}>
            {ACCOUNT_DELETE_MODAL_COPY.cancelButton}
          </button>
        </div>

        {error ? (
          <p className="error" role="alert" style={{ fontSize: 13, margin: 0 }}>
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
