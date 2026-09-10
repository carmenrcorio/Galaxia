"use client";

/**
 * Minimal, non-interactive Sun / Moon / Rising chips — glyph + label + sign
 * value only, no readings, no expand/collapse state.
 *
 * Distinct from /app/person/[id]'s "Big Three" section, which is stateful
 * (per-sign expand/collapse with full readings, houses, aspects) and is not
 * safe to capture for image export as-is (open/collapse state, excessive
 * length). This presentational sibling exists purely so ShareExportCard has
 * something honest and static to wrap next to the chart wheel.
 */

import { SIGN_GLYPH, signElement } from "../lib/design";

export type BigThreeChip = {
  label: "Sun" | "Moon" | "Rising";
  sign: string | undefined;
  /** A sign the engine flagged as uncertain is never presented as fact (§12). */
  uncertain?: boolean;
};

export function NatalBigThreeChips({ chips }: { chips: BigThreeChip[] }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap", margin: "14px 0" }}>
      {chips.map((chip) => {
        if (chip.uncertain) {
          return (
            <div key={chip.label} className="sign-chip" style={{ opacity: 0.6 }}>
              <span className="sign-chip__glyph" style={{ color: "var(--mist2)" }}>?</span>
              <span className="sign-chip__label">{chip.label}</span>
              <span className="sign-chip__value">Uncertain</span>
            </div>
          );
        }
        if (!chip.sign) {
          return (
            <div key={chip.label} className="sign-chip" style={{ opacity: 0.45 }}>
              <span className="sign-chip__glyph" style={{ color: "var(--mist2)" }}>—</span>
              <span className="sign-chip__label">{chip.label}</span>
              <span className="sign-chip__value">{chip.label === "Rising" ? "Exact time + city needed" : "—"}</span>
            </div>
          );
        }
        return (
          <div key={chip.label} className="sign-chip">
            <span className="sign-chip__glyph" style={{ color: `var(--${signElement(chip.sign)})` }}>
              {SIGN_GLYPH[chip.sign]}
            </span>
            <span className="sign-chip__label">{chip.label}</span>
            <span className="sign-chip__value">{chip.sign}</span>
          </div>
        );
      })}
    </div>
  );
}
