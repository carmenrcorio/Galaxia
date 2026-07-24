"use client";

/**
 * Memorial constellation picker for the Remembrance space.
 * Collapsed by default: one row (glyph + name + Change). The full library
 * (summaries + myths) opens only on Change, then collapses again after pick.
 * Writes `people.memorial_constellation` — the same column `/app` already reads
 * via usesMemorialGlyph → getMemorialConstellation for glyph render.
 */

import {
  MEMORIAL_CONSTELLATIONS,
  MEMORIAL_CONSTELLATION_PICKER_COPY,
  getMemorialConstellation,
  normalizeMemorialConstellationForWrite,
  type MemorialConstellationId,
} from "@galaxia/core";
import { useEffect, useId, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "../lib/supabase/client";
import { REMEMBRANCE_CHROME } from "../lib/remembrance";
import { MemorialConstellationGlyph } from "./memorial-constellation-glyph";
import { Spinner } from "./spinner";

export function MemorialConstellationPicker({
  personId,
  userId,
  value,
  onChanged,
}: {
  personId: string;
  userId: string;
  /** Current `people.memorial_constellation` (null = ancient light). */
  value: string | null | undefined;
  onChanged?: (next: MemorialConstellationId | null) => void;
}) {
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [selected, setSelected] = useState<MemorialConstellationId | null>(
    normalizeMemorialConstellationForWrite(value)
  );
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogTitleId = useId();
  const changeButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    setSelected(normalizeMemorialConstellationForWrite(value));
  }, [value]);

  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      closeButtonRef.current?.focus();
      function onKey(e: KeyboardEvent) {
        if (e.key === "Escape") {
          e.preventDefault();
          setOpen(false);
        }
      }
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      // Return focus to Change after the library closes.
      changeButtonRef.current?.focus({ preventScroll: true });
    }
  }, [open]);

  async function choose(next: MemorialConstellationId | null) {
    if (busy) return;
    const normalized = normalizeMemorialConstellationForWrite(next);
    if (normalized === selected) {
      setOpen(false);
      return;
    }
    setBusy(true);
    setError(null);
    const { error: writeErr } = await supabase
      .from("people")
      .update({ memorial_constellation: normalized })
      .eq("id", personId)
      .eq("owner_id", userId);
    setBusy(false);
    if (writeErr) {
      setError(writeErr.message);
      return;
    }
    setSelected(normalized);
    setOpen(false);
    onChanged?.(normalized);
  }

  const pattern = selected ? getMemorialConstellation(selected) : null;
  const selectedName = pattern?.name ?? MEMORIAL_CONSTELLATION_PICKER_COPY.noneLabel;

  return (
    <div style={{ marginBottom: 18 }}>
      {/* FOUNDER-REVIEW: MEMORIAL_CONSTELLATION_PICKER_COPY.label */}
      <p className="eyebrow" style={{ marginBottom: 8, color: REMEMBRANCE_CHROME.ancient }}>
        {MEMORIAL_CONSTELLATION_PICKER_COPY.label}
      </p>

      {/* Collapsed selection row — glyph + name + Change. No myths here. */}
      <div
        className="memorial-constellation-collapsed"
        style={{
          display: "grid",
          gridTemplateColumns: "48px minmax(0, 1fr) auto",
          gap: 12,
          alignItems: "center",
          padding: "10px 12px",
          borderRadius: 14,
          border: `1px solid ${REMEMBRANCE_CHROME.border}`,
          background: "rgba(10,7,23,.28)",
        }}
      >
        {pattern ? (
          <MemorialConstellationGlyph
            pattern={pattern}
            size={44}
            color="var(--gold)"
            title={pattern.name}
          />
        ) : (
          <span
            aria-hidden
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              justifySelf: "center",
              background:
                "radial-gradient(circle, rgba(111,177,184,.40) 0%, rgba(218,140,140,.16) 45%, transparent 70%)",
              boxShadow: "inset 0 0 0 1px rgba(111,177,184,.25)",
            }}
          />
        )}
        <span
          style={{
            fontSize: ".92rem",
            color: pattern ? "var(--gold)" : "var(--cream)",
            minWidth: 0,
            overflowWrap: "anywhere",
          }}
        >
          {/* FOUNDER-REVIEW: pattern.name / MEMORIAL_CONSTELLATION_PICKER_COPY.noneLabel */}
          {selectedName}
        </span>
        <button
          ref={changeButtonRef}
          type="button"
          className="pill-link"
          aria-haspopup="dialog"
          aria-expanded={open}
          disabled={busy}
          onClick={() => {
            setError(null);
            setOpen(true);
          }}
          style={{ fontSize: ".76rem", padding: "5px 12px", flexShrink: 0 }}
        >
          Change
        </button>
      </div>

      {busy && !open ? (
        <p className="muted" style={{ fontSize: ".76rem", marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <Spinner size={12} /> Saving constellation…
        </p>
      ) : null}
      {error && !open ? <p className="error" style={{ fontSize: ".82rem", marginTop: 10 }}>{error}</p> : null}

      {open ? (
        <div
          role="presentation"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            background: "rgba(10,7,23,.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => {
            if (!busy) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            className="glass-card memorial-constellation-library"
            style={{
              maxWidth: 480,
              width: "100%",
              maxHeight: "88vh",
              overflowY: "auto",
              borderColor: REMEMBRANCE_CHROME.border,
              background: REMEMBRANCE_CHROME.background,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 8 }}>
              {/* FOUNDER-REVIEW: MEMORIAL_CONSTELLATION_PICKER_COPY.label */}
              <p id={dialogTitleId} className="eyebrow" style={{ margin: 0, color: REMEMBRANCE_CHROME.ancient }}>
                {MEMORIAL_CONSTELLATION_PICKER_COPY.label}
              </p>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                aria-label="Close constellation library"
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--mist2)",
                  fontSize: "1.2rem",
                  cursor: busy ? "wait" : "pointer",
                  lineHeight: 1,
                  padding: 4,
                }}
              >
                ×
              </button>
            </div>
            {/* FOUNDER-REVIEW: MEMORIAL_CONSTELLATION_PICKER_COPY.helper */}
            <p className="muted" style={{ fontSize: ".78rem", lineHeight: 1.55, margin: "0 0 14px", maxWidth: "52ch" }}>
              {MEMORIAL_CONSTELLATION_PICKER_COPY.helper}
            </p>

            <div
              role="radiogroup"
              /* FOUNDER-REVIEW: MEMORIAL_CONSTELLATION_PICKER_COPY.label */
              aria-label={MEMORIAL_CONSTELLATION_PICKER_COPY.label}
              style={{ display: "grid", gap: 8 }}
            >
              {/* None — ancient light (common case) */}
              <button
                type="button"
                role="radio"
                aria-checked={selected === null}
                /* FOUNDER-REVIEW: MEMORIAL_CONSTELLATION_PICKER_COPY.noneLabel */
                aria-label={MEMORIAL_CONSTELLATION_PICKER_COPY.noneLabel}
                disabled={busy}
                onClick={() => void choose(null)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "64px minmax(0, 1fr)",
                  gap: 12,
                  alignItems: "center",
                  textAlign: "left",
                  padding: "12px 14px",
                  borderRadius: 14,
                  cursor: busy ? "wait" : "pointer",
                  border: selected === null
                    ? "1px solid rgba(230,174,108,.55)"
                    : `1px solid ${REMEMBRANCE_CHROME.border}`,
                  background: selected === null
                    ? "rgba(230,174,108,.10)"
                    : "rgba(10,7,23,.28)",
                  color: "var(--cream)",
                  fontFamily: "var(--sans)",
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    justifySelf: "center",
                    background:
                      "radial-gradient(circle, rgba(111,177,184,.40) 0%, rgba(218,140,140,.16) 45%, transparent 70%)",
                    boxShadow: "inset 0 0 0 1px rgba(111,177,184,.25)",
                  }}
                />
                <span style={{ display: "grid", gap: 4, minWidth: 0 }}>
                  {/* FOUNDER-REVIEW: MEMORIAL_CONSTELLATION_PICKER_COPY.noneLabel */}
                  <span style={{ fontSize: ".92rem", color: selected === null ? "var(--gold)" : "var(--cream)" }}>
                    {MEMORIAL_CONSTELLATION_PICKER_COPY.noneLabel}
                  </span>
                  {/* FOUNDER-REVIEW: MEMORIAL_CONSTELLATION_PICKER_COPY.noneHelper */}
                  <span className="muted" style={{ fontSize: ".76rem", lineHeight: 1.45 }}>
                    {MEMORIAL_CONSTELLATION_PICKER_COPY.noneHelper}
                  </span>
                  {/* FOUNDER-REVIEW: MEMORIAL_CONSTELLATION_PICKER_COPY.noneMyth */}
                  <span style={{ fontSize: ".76rem", lineHeight: 1.45, color: "var(--mist)", fontFamily: "var(--serif)" }}>
                    {MEMORIAL_CONSTELLATION_PICKER_COPY.noneMyth}
                  </span>
                </span>
              </button>

              {MEMORIAL_CONSTELLATIONS.map((entry) => {
                const isSelected = selected === entry.id;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    /* FOUNDER-REVIEW: pattern.name */
                    aria-label={entry.name}
                    disabled={busy}
                    onClick={() => void choose(entry.id as MemorialConstellationId)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "64px minmax(0, 1fr)",
                      gap: 12,
                      alignItems: "start",
                      textAlign: "left",
                      padding: "12px 14px",
                      borderRadius: 14,
                      cursor: busy ? "wait" : "pointer",
                      border: isSelected
                        ? "1px solid rgba(230,174,108,.55)"
                        : `1px solid ${REMEMBRANCE_CHROME.border}`,
                      background: isSelected
                        ? "rgba(230,174,108,.10)"
                        : "rgba(10,7,23,.28)",
                      color: "var(--cream)",
                      fontFamily: "var(--sans)",
                    }}
                  >
                    <MemorialConstellationGlyph
                      pattern={entry}
                      size={56}
                      color={isSelected ? "var(--gold)" : "var(--gold-soft)"}
                      title={entry.name}
                    />
                    <span style={{ display: "grid", gap: 4, minWidth: 0 }}>
                      {/* FOUNDER-REVIEW: pattern.name */}
                      <span style={{ fontSize: ".92rem", color: isSelected ? "var(--gold)" : "var(--cream)" }}>
                        {entry.name}
                        <span className="muted" style={{ fontSize: ".72rem", marginLeft: 8, fontFamily: "var(--sans)" }}>
                          {entry.iau}
                        </span>
                      </span>
                      {/* FOUNDER-REVIEW: pattern.summary */}
                      <span className="muted" style={{ fontSize: ".76rem", lineHeight: 1.45 }}>
                        {entry.summary}
                      </span>
                      {/* FOUNDER-REVIEW: pattern.myth — real mythology only */}
                      <span style={{ fontSize: ".76rem", lineHeight: 1.45, color: "var(--mist)", fontFamily: "var(--serif)" }}>
                        {entry.myth}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {busy ? (
              <p className="muted" style={{ fontSize: ".76rem", marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <Spinner size={12} /> Saving constellation…
              </p>
            ) : null}
            {error ? <p className="error" style={{ fontSize: ".82rem", marginTop: 12 }}>{error}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
