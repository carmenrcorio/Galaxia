"use client";

import type { CSSProperties } from "react";
import { PIN_THEME_IDS, type PinThemeId } from "@galaxia/core";
import {
  PIN_THEME_LABELS,
  VELA_PIN_NO_THEME,
  VELA_PIN_THEME_LABEL,
  VELA_PIN_THEME_SUGGESTED
} from "../lib/vela-pin-copy";

const CHIP: CSSProperties = {
  fontSize: ".68rem",
  letterSpacing: ".04em",
  borderRadius: 999,
  padding: "4px 9px",
  cursor: "pointer",
  border: "1px solid rgba(183,154,216,.28)",
  background: "transparent",
  color: "var(--mist2)"
};

const CHIP_ON: CSSProperties = {
  ...CHIP,
  background: "rgba(183,154,216,.18)",
  color: "var(--cream)",
  border: "1px solid rgba(183,154,216,.5)"
};

export function PinThemePicker({
  value,
  onChange,
  showHint = false
}: {
  value: PinThemeId | null;
  onChange: (theme: PinThemeId | null) => void;
  showHint?: boolean;
}) {
  return (
    <div role="group" aria-label={VELA_PIN_THEME_LABEL} style={{ display: "grid", gap: 6 }}>
      <p className="muted" style={{ fontSize: ".62rem", letterSpacing: ".1em", textTransform: "uppercase", margin: 0 }}>
        {VELA_PIN_THEME_LABEL}
      </p>
      {showHint ? (
        <p className="muted" style={{ fontSize: ".72rem", margin: 0 }}>{VELA_PIN_THEME_SUGGESTED}</p>
      ) : null}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {PIN_THEME_IDS.map((id) => {
          const on = value === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? null : id)}
              style={on ? CHIP_ON : CHIP}
            >
              {PIN_THEME_LABELS[id]}
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={value === null}
          onClick={() => onChange(null)}
          style={value === null ? CHIP_ON : CHIP}
        >
          {VELA_PIN_NO_THEME}
        </button>
      </div>
    </div>
  );
}
