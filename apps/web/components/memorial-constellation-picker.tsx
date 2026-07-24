"use client";

/**
 * Memorial constellation picker for the Remembrance space.
 * Writes `people.memorial_constellation` — the same column `/app` already reads
 * via usesMemorialGlyph → getMemorialConstellation for glyph render.
 */

import {
  MEMORIAL_CONSTELLATIONS,
  MEMORIAL_CONSTELLATION_PICKER_COPY,
  normalizeMemorialConstellationForWrite,
  type MemorialConstellationId,
} from "@galaxia/core";
import { useEffect, useState } from "react";
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelected(normalizeMemorialConstellationForWrite(value));
  }, [value]);

  async function choose(next: MemorialConstellationId | null) {
    if (busy) return;
    const normalized = normalizeMemorialConstellationForWrite(next);
    if (normalized === selected) return;
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
    onChanged?.(normalized);
  }

  return (
    <div style={{ marginBottom: 18 }}>
      {/* FOUNDER-REVIEW: MEMORIAL_CONSTELLATION_PICKER_COPY.label */}
      <p className="eyebrow" style={{ marginBottom: 6, color: REMEMBRANCE_CHROME.ancient }}>
        {MEMORIAL_CONSTELLATION_PICKER_COPY.label}
      </p>
      {/* FOUNDER-REVIEW: MEMORIAL_CONSTELLATION_PICKER_COPY.helper */}
      <p className="muted" style={{ fontSize: ".78rem", lineHeight: 1.55, margin: "0 0 12px", maxWidth: "52ch" }}>
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

        {MEMORIAL_CONSTELLATIONS.map((pattern) => {
          const isSelected = selected === pattern.id;
          return (
            <button
              key={pattern.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              /* FOUNDER-REVIEW: pattern.name */
              aria-label={pattern.name}
              disabled={busy}
              onClick={() => void choose(pattern.id as MemorialConstellationId)}
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
                pattern={pattern}
                size={56}
                color={isSelected ? "var(--gold)" : "var(--gold-soft)"}
                title={pattern.name}
              />
              <span style={{ display: "grid", gap: 4, minWidth: 0 }}>
                {/* FOUNDER-REVIEW: pattern.name */}
                <span style={{ fontSize: ".92rem", color: isSelected ? "var(--gold)" : "var(--cream)" }}>
                  {pattern.name}
                  <span className="muted" style={{ fontSize: ".72rem", marginLeft: 8, fontFamily: "var(--sans)" }}>
                    {pattern.iau}
                  </span>
                </span>
                {/* FOUNDER-REVIEW: pattern.summary */}
                <span className="muted" style={{ fontSize: ".76rem", lineHeight: 1.45 }}>
                  {pattern.summary}
                </span>
                {/* FOUNDER-REVIEW: pattern.myth — real mythology only */}
                <span style={{ fontSize: ".76rem", lineHeight: 1.45, color: "var(--mist)", fontFamily: "var(--serif)" }}>
                  {pattern.myth}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {busy ? (
        <p className="muted" style={{ fontSize: ".76rem", marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <Spinner size={12} /> Saving constellation…
        </p>
      ) : null}
      {error ? <p className="error" style={{ fontSize: ".82rem", marginTop: 10 }}>{error}</p> : null}
    </div>
  );
}
