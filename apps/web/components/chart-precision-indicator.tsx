"use client";

/**
 * Quiet persistent chart-precision fact on a person profile.
 * Not a warning banner. Tap to read what this precision supports,
 * what it does not, and why. One optional upgrade action.
 */

import {
  CHART_PRECISION_DOES_NOT_HEADING,
  CHART_PRECISION_SUPPORTS_HEADING,
  CHART_PRECISION_WHY_HEADING,
  chartPrecisionExplanation,
  chartPrecisionFact,
  chartPrecisionUpgrade,
  type ChartPrecision,
} from "@galaxia/core";
import { useId, useState } from "react";

export function ChartPrecisionIndicator({
  precision,
  hasBirthPlace = false,
  onUpgrade,
  showUpgrade = true,
}: {
  precision: ChartPrecision | string;
  hasBirthPlace?: boolean;
  /** Opens the prefilled editor on the missing detail. Omit on surfaces that cannot edit. */
  onUpgrade?: (target: Exclude<ChartPrecision, "none">) => void;
  /** Profile header shows the action once. Empty states pass the action themselves. */
  showUpgrade?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const explanation = chartPrecisionExplanation(precision, { hasBirthPlace });
  const upgrade = chartPrecisionUpgrade(precision, { hasBirthPlace });
  const label = chartPrecisionFact(precision);

  return (
    <div>
      <button
        type="button"
        className="muted"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((prev) => !prev)}
        style={{
          display: "inline",
          padding: 0,
          margin: 0,
          border: "none",
          background: "none",
          font: "inherit",
          fontSize: ".88rem",
          color: "var(--mist2)",
          cursor: "pointer",
          textAlign: "left",
          textDecoration: "underline",
          textDecorationStyle: "dotted",
          textUnderlineOffset: 3,
        }}
      >
        {label}
      </button>
      {open ? (
        <div
          id={panelId}
          className="glass-card"
          style={{ marginTop: 10, padding: "12px 14px", display: "grid", gap: 10 }}
        >
          <div>
                        <p className="eyebrow" style={{ marginBottom: 4 }}>{CHART_PRECISION_SUPPORTS_HEADING}</p>
            <p className="muted" style={{ fontSize: ".82rem", lineHeight: 1.55, margin: 0 }}>{explanation.supports}</p>
          </div>
          <div>
                        <p className="eyebrow" style={{ marginBottom: 4 }}>{CHART_PRECISION_DOES_NOT_HEADING}</p>
            <p className="muted" style={{ fontSize: ".82rem", lineHeight: 1.55, margin: 0 }}>{explanation.doesNot}</p>
          </div>
          <div>
                        <p className="eyebrow" style={{ marginBottom: 4 }}>{CHART_PRECISION_WHY_HEADING}</p>
            <p className="muted" style={{ fontSize: ".82rem", lineHeight: 1.55, margin: 0 }}>{explanation.why}</p>
          </div>
        </div>
      ) : null}
      {showUpgrade && upgrade && onUpgrade ? (
        <div style={{ marginTop: 8 }}>
          <ChartPrecisionUpgradeButton precision={precision} hasBirthPlace={hasBirthPlace} onUpgrade={onUpgrade} />
        </div>
      ) : null}
    </div>
  );
}

/** Single quiet action to add the missing detail. Used once per empty state. */
export function ChartPrecisionUpgradeButton({
  precision,
  hasBirthPlace = false,
  onUpgrade,
}: {
  precision: ChartPrecision | string;
  hasBirthPlace?: boolean;
  onUpgrade: (target: Exclude<ChartPrecision, "none">) => void;
}) {
  const upgrade = chartPrecisionUpgrade(precision, { hasBirthPlace });
  if (!upgrade) return null;
  return (
    <button
      type="button"
      className="pill-link"
      style={{ fontSize: ".78rem" }}
      onClick={() => onUpgrade(upgrade.target)}
    >
      {upgrade.actionLabel}
    </button>
  );
}
