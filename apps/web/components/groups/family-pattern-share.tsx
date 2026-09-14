"use client";

import { useEffect, useId, useState } from "react";
import type { FamilyComparePersonInput } from "@galaxia/astro";
import { Spinner } from "../spinner";
import {
  FAMILY_PATTERN_CARD_ACK,
  FAMILY_PATTERN_CARD_CANCEL,
  FAMILY_PATTERN_CARD_CONFIRM,
  FAMILY_PATTERN_CARD_DISABLED,
  FAMILY_PATTERN_CARD_FAIL,
  FAMILY_PATTERN_CARD_FILENAME,
  FAMILY_PATTERN_CARD_HEADLINE_LABEL,
  FAMILY_PATTERN_CARD_LINE_LABEL,
  FAMILY_PATTERN_CARD_NO_PATTERN,
  FAMILY_PATTERN_CARD_PRIVACY_BODY,
  FAMILY_PATTERN_CARD_PRIVACY_TITLE,
  FAMILY_PATTERN_CARD_REMEMBERED,
  FAMILY_PATTERN_CARD_REMOVE,
  FAMILY_PATTERN_CARD_SHARE_LABEL,
  FAMILY_PATTERN_CARD_WHAT_HEADING,
  FAMILY_PATTERN_CARD_WHO_HEADING,
  buildFamilyPatternCard,
  toFamilyPatternCardRenderInput,
} from "../../lib/family-pattern-card";
import { SHARE_SUCCESS_REVERT_MS, deliverSharePng, shouldRevertShareStatus } from "../../lib/share-image";

export function FamilyPatternShare({ members }: { members: FamilyComparePersonInput[] }) {
  const titleId = useId();
  const ackId = useId();
  const [open, setOpen] = useState(false);
  const [includedIds, setIncludedIds] = useState<string[]>(() => members.map((m) => m.id));
  const [acked, setAcked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const card = buildFamilyPatternCard(members, includedIds);
  const canOpen = buildFamilyPatternCard(members, members.map((m) => m.id)) !== null;

  useEffect(() => {
    if (!status) return;
    const revert = () => setStatus(null);
    const timer = window.setTimeout(revert, SHARE_SUCCESS_REVERT_MS);
    const onVis = () => {
      if (shouldRevertShareStatus(document.hidden)) revert();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [status]);

  function openDialog() {
    if (!canOpen || busy) return;
    setIncludedIds(members.map((m) => m.id));
    setAcked(false);
    setError(null);
    setStatus(null);
    setOpen(true);
  }

  function removePerson(id: string) {
    setIncludedIds((ids) => ids.filter((x) => x !== id));
    setAcked(false);
  }

  async function confirm() {
    if (!card || !acked || busy) return;
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const response = await fetch("/api/family-pattern-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toFamilyPatternCardRenderInput(card)),
      });
      if (!response.ok) {
        throw new Error(FAMILY_PATTERN_CARD_FAIL);
      }
      const blob = await response.blob();
      try {
        const result = await deliverSharePng(blob, FAMILY_PATTERN_CARD_FILENAME);
        setStatus(result === "shared" ? "Shared" : "Image saved");
        setOpen(false);
      } catch (shareErr) {
        if (shareErr instanceof DOMException && shareErr.name === "AbortError") {
          setOpen(false);
          return;
        }
        throw shareErr;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : FAMILY_PATTERN_CARD_FAIL);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 6, justifyItems: "center" }}>
      <button
        type="button"
        className="pill-link"
        onClick={openDialog}
        disabled={!canOpen || busy}
        title={canOpen ? undefined : FAMILY_PATTERN_CARD_DISABLED}
      >
        {status ?? FAMILY_PATTERN_CARD_SHARE_LABEL}
      </button>
      {!canOpen ? (
        <p className="muted" style={{ fontSize: ".72rem", margin: 0, textAlign: "center", maxWidth: "36ch" }}>
          {FAMILY_PATTERN_CARD_DISABLED}
        </p>
      ) : null}

      {open ? (
        <div
          role="presentation"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            background: "rgba(10,7,23,.75)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: "24px 16px",
            overflowY: "auto",
          }}
          onClick={() => {
            if (!busy) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="glass-card"
            style={{ maxWidth: 480, width: "100%", margin: "0 auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <p id={titleId} className="eyebrow" style={{ margin: 0 }}>
              {FAMILY_PATTERN_CARD_PRIVACY_TITLE}
            </p>
            <p className="muted" style={{ fontSize: ".82rem", lineHeight: 1.6, margin: "10px 0 0" }}>
              {FAMILY_PATTERN_CARD_PRIVACY_BODY}
            </p>

            <p className="eyebrow" style={{ fontSize: ".62rem", margin: "18px 0 8px" }}>
              {FAMILY_PATTERN_CARD_WHO_HEADING}
            </p>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
              {members.filter((m) => includedIds.includes(m.id)).map((person) => {
                const row = card?.people.find((p) => p.id === person.id);
                const firstName = row?.firstName ?? person.name;
                return (
                  <li
                    key={person.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <span style={{ fontFamily: "var(--serif)", color: "var(--cream)", fontSize: ".9rem" }}>
                      {firstName}
                      {person.passed ? (
                        <span style={{ color: "var(--gold-soft)", fontSize: ".72rem", marginLeft: 6 }}>
                          ✦ {FAMILY_PATTERN_CARD_REMEMBERED}
                        </span>
                      ) : null}
                    </span>
                    <button
                      type="button"
                      className="pill-link"
                      style={{ fontSize: ".68rem", padding: "2px 8px" }}
                      onClick={() => removePerson(person.id)}
                      disabled={busy}
                    >
                      {FAMILY_PATTERN_CARD_REMOVE}
                    </button>
                  </li>
                );
              })}
            </ul>

            {card ? (
              <>
                <p className="eyebrow" style={{ fontSize: ".62rem", margin: "18px 0 8px" }}>
                  {FAMILY_PATTERN_CARD_WHAT_HEADING}
                </p>
                <p style={{ margin: 0, fontFamily: "var(--serif)", color: "var(--cream)", fontSize: "1.05rem" }}>
                  <span className="muted" style={{ fontSize: ".68rem", display: "block", marginBottom: 4 }}>
                    {FAMILY_PATTERN_CARD_HEADLINE_LABEL}
                  </span>
                  {card.headline}
                </p>
                <p className="muted" style={{ fontSize: ".86rem", lineHeight: 1.55, margin: "12px 0 0" }}>
                  <span className="muted" style={{ fontSize: ".68rem", display: "block", marginBottom: 4 }}>
                    {FAMILY_PATTERN_CARD_LINE_LABEL}
                  </span>
                  {card.interpretation}
                </p>
              </>
            ) : (
              <p className="muted" style={{ fontSize: ".84rem", lineHeight: 1.6, margin: "16px 0 0" }}>
                {FAMILY_PATTERN_CARD_NO_PATTERN}
              </p>
            )}

            <label
              htmlFor={ackId}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                marginTop: 18,
                fontSize: ".8rem",
                lineHeight: 1.5,
                color: "var(--mist)",
              }}
            >
              <input
                id={ackId}
                type="checkbox"
                checked={acked}
                onChange={(e) => setAcked(e.target.checked)}
                disabled={!card || busy}
                style={{ marginTop: 3 }}
              />
              {FAMILY_PATTERN_CARD_ACK}
            </label>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 18 }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => void confirm()}
                disabled={!card || !acked || busy}
                style={{ gap: 8 }}
              >
                {busy && <Spinner size={12} />}
                {busy ? "Creating image…" : FAMILY_PATTERN_CARD_CONFIRM}
              </button>
              <button type="button" className="pill-link" onClick={() => setOpen(false)} disabled={busy}>
                {FAMILY_PATTERN_CARD_CANCEL}
              </button>
            </div>
            {error ? <p className="error" style={{ fontSize: ".78rem", margin: "10px 0 0" }}>{error}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
