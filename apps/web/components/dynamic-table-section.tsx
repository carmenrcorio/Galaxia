"use client";

/**
 * Shared "Your dynamic" ratings table for Quick Compare (/chart/compare)
 * and compare share snapshots (/s/[token]). One markup path — both surfaces
 * inherit. Words/bands from compatWord; colors from compat-high|mid|low CSS.
 * Does not re-derive scores or override band colors.
 */

import type { ReactNode } from "react";
import { COMPAT_LABELS, compatWord } from "../lib/design";

// FOUNDER-REVIEW: authored — ease-scale legend for Your dynamic ratings table.
const DYNAMIC_SCALE_LEGEND =
  "How to read this: these run from easiest to most effort. Gold comes naturally, teal takes a little tending, rose takes real work. Charged is the far end, the most friction between you, not the most spark.";

export type DynamicScores = Record<string, number>;

type Props = {
  scores: DynamicScores;
  /** "What X needs from you" callouts (and any other section body). */
  children?: ReactNode;
};

export function DynamicTableSection({ scores, children }: Props) {
  return (
    <section className="glass-card fade-in fade-in-delay-1">
      <p className="eyebrow" style={{ marginBottom: 12 }}>Your dynamic</p>
      <p className="muted" style={{ fontSize: ".72rem", lineHeight: 1.5, marginBottom: 10 }}>
        {DYNAMIC_SCALE_LEGEND}
      </p>
      <div
        style={{
          borderRadius: 14,
          background: "rgba(111,177,184,.06)",
          border: "1px solid rgba(111,177,184,.15)",
          padding: "4px 0",
          marginBottom: 14,
        }}
      >
        {Object.entries(scores).map(([key, score]) => {
          const { word, cls } = compatWord(score);
          return (
            <div
              key={key}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "9px 16px",
                borderTop: key === "overall" ? "none" : "1px solid rgba(255,255,255,.04)",
              }}
            >
              <span style={{ fontSize: ".82rem", color: "var(--mist)" }}>{COMPAT_LABELS[key] ?? key}</span>
              <span className={`compat-word ${cls}`} style={{ fontSize: ".88rem", fontFamily: "var(--serif)" }}>
                {word}
              </span>
            </div>
          );
        })}
      </div>
      {children}
    </section>
  );
}
