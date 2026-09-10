"use client";

/**
 * Bare six-row "Your dynamic" score table — no legend, no "what X needs"
 * tip cards. Extracted from DynamicTableSection so a compact image export
 * (ShareExportCard on /chart/compare, /app/compare, /s/[token] compare) can
 * render just the scores next to the wheel and stay legible at phone
 * screenshot size, while the full-page reading keeps the legend + tips via
 * DynamicTableSection, which wraps this same table unchanged.
 */

import { COMPAT_LABELS, compatWord } from "../lib/design";

export type DynamicScores = Record<string, number>;

export function DynamicScoresTable({ scores }: { scores: DynamicScores }) {
  return (
    <div
      style={{
        borderRadius: 14,
        background: "rgba(111,177,184,.06)",
        border: "1px solid rgba(111,177,184,.15)",
        padding: "4px 0",
      }}
    >
      {Object.entries(scores).map(([key, score]) => {
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
  );
}
