"use client";

/**
 * Shared "Your dynamic" ratings table for Quick Compare (/chart/compare)
 * and compare share snapshots (/s/[token]). One markup path — both surfaces
 * inherit. Words/bands from compatWord; colors from compat-high|mid|low CSS.
 * Does not re-derive scores or override band colors.
 */

import { orderedScoreEntries } from "@galaxia/astro";
import type { ReactNode } from "react";
import { COMPAT_LABELS, compatWord } from "../lib/design";

const DYNAMIC_SCALE_LEGEND =
  "How to read this: these run from easiest to most effort. Gold comes naturally, teal takes a little tending, rose takes real work. Charged is the far end, the most friction between you, not the most spark.";

export type DynamicScores = Record<string, number>;

type Props = {
  scores: DynamicScores;
  /** "What X needs from you" callouts (and any other section body). */
  children?: ReactNode;
  /** Relationship-level insight rendered once, not inside a person card. */
  watchLine?: string | null;
};

export function DynamicTableSection({ scores, children, watchLine }: Props) {
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
        {orderedScoreEntries(scores).map(({ key, score }) => {
          const { word, cls } = compatWord(score);
          return (
            <div
              key={key}
              className="dyn-row"
              style={{
                borderTop: key === "overall" ? "none" : "1px solid rgba(255,255,255,.04)",
              }}
            >
              <span className="dyn-row-label" style={{ fontSize: ".82rem", color: "var(--mist)" }}>{COMPAT_LABELS[key] ?? key}</span>
              <span className={`compat-word dyn-row-value ${cls}`} style={{ fontSize: ".88rem", fontFamily: "var(--serif)" }}>
                {word}
              </span>
            </div>
          );
        })}
      </div>
      {children}
      {watchLine ? (
        <p
          className="muted"
          style={{
            fontSize: ".82rem",
            lineHeight: 1.62,
            fontStyle: "italic",
            margin: "4px 0 0",
            borderLeft: "2px solid rgba(183,154,216,.35)",
            paddingLeft: 12,
          }}
        >
          {watchLine}
        </p>
      ) : null}
    </section>
  );
}
