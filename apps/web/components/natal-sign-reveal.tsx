"use client";

/**
 * Natal sign reveal — Sun / Moon / Rising chips with short readings.
 *
 * Shared by the landing mini-form, public Quick Chart (/chart), and single
 * share snapshots (/s). Labels only placements the chart actually has; an
 * absent Rising is never presented as a third computed sign.
 *
 * Minor safety: when `birthDate` is provided, calls isMinorForSafety so any
 * future adults-only reveal content has one gate. Natal Sun/Moon copy is not
 * adults-only — a minor currently renders identically to an adult. /s single
 * shares pass no birthDate (PII stripped by design); do not persist a minor
 * flag on single shares.
 */

import {
  interpretPlacement,
  interpretRising,
  type BodyKey,
  type NatalChart,
  type SignKey,
} from "@galaxia/astro";
import { isMinorForSafety } from "@galaxia/core";
import Link from "next/link";
import type { Route } from "next";
import type { CSSProperties } from "react";
import { SIGN_GLYPH, signElement } from "../lib/design";

export type NatalSignRevealProps = {
  chart: NatalChart;
  displayDate: string;
  birthPlace?: string | null;
  /** Local display only — never required; /s singles are nameless. */
  name?: string;
  /**
   * When set, run isMinorForSafety (same call shape as Quick Compare / save).
   * Omit on /s — single snapshots strip birth PII and must not reintroduce it.
   */
  birthDate?: string | null;
  birthPrecision?: "none" | "exact" | "date" | "year" | null;
  /** Prefill link for the Rising conversion line. Omit when there is nothing to prefill. */
  fullChartHref?: string;
  /** Signup CTA directly under the chips. Landing only. */
  signupHref?: string;
  className?: string;
  style?: CSSProperties;
};

type Chip = {
  label: string;
  sign: string;
  reading: string;
};

export function NatalSignReveal({
  chart,
  displayDate,
  birthPlace = null,
  name,
  birthDate,
  birthPrecision = null,
  fullChartHref,
  signupHref,
  className,
  style,
}: NatalSignRevealProps) {
  // Reserved gate for future adults-only reveal content. Sun/Moon natal copy
  // is age-appropriate for all subjects — no notice, no withheld readings.
  if (birthDate) {
    isMinorForSafety({
      isMinor: false,
      birthDate,
      birthPrecision: birthPrecision ?? "date",
    });
  }

  const sun = chart.placements.find((p) => p.body === "sun");
  const moon = chart.placements.find((p) => p.body === "moon");
  const rising = chart.asc;

  const chips: Chip[] = [];
  if (sun?.sign) {
    chips.push({
      label: "Sun",
      sign: sun.sign,
      reading: interpretPlacement(sun.body as BodyKey, sun.sign as SignKey).short,
    });
  }
  if (moon?.sign) {
    chips.push({
      label: "Moon",
      sign: moon.sign,
      reading: interpretPlacement(moon.body as BodyKey, moon.sign as SignKey).short,
    });
  }
  if (rising) {
    chips.push({
      label: "Rising",
      sign: rising,
      reading: interpretRising(rising as SignKey).short,
    });
  }

  const label = name?.trim() ? name.trim() : "This chart";

  return (
    <section
      className={["glass-card", "fade-in", "natal-sign-reveal", className].filter(Boolean).join(" ")}
      style={{ textAlign: "center", ...style }}
    >
      <p className="muted" style={{ fontSize: ".8rem", marginBottom: 4 }}>
        {label} · {displayDate}
        {birthPlace ? ` · ${birthPlace}` : ""}
      </p>

      {chips.length > 0 ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 16,
            flexWrap: "wrap",
            margin: "14px 0",
          }}
        >
          {chips.map((chip) => (
            <div key={chip.label} className="sign-chip">
              <span
                className="sign-chip__glyph"
                style={{ color: `var(--${signElement(chip.sign)})` }}
              >
                {SIGN_GLYPH[chip.sign]}
              </span>
              <span className="sign-chip__label">{chip.label}</span>
              <span className="sign-chip__value">{chip.sign}</span>
              <span
                className="muted"
                style={{ fontSize: ".7rem", fontStyle: "italic", display: "block", marginTop: 3 }}
              >
                {chip.reading}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {signupHref ? (
        <div className="natal-sign-reveal__signup" style={{ marginTop: 4, marginBottom: rising ? 0 : 10 }}>
          {/* FOUNDER-REVIEW: authored — landing reveal signup CTA. */}
          <Link href={signupHref as Route} className="btn-primary">
            Start 14 days free
          </Link>
        </div>
      ) : null}

      {!rising ? (
        <p className="muted natal-sign-reveal__rising-note" style={{ fontSize: ".76rem", marginTop: 8, lineHeight: 1.5 }}>
          {/* FOUNDER-REVIEW: authored — Rising absent; conversion hook when href provided. */}
          Rising needs a birth time and city.
          {fullChartHref ? (
            <>
              {" "}
              <Link href={fullChartHref as Route} className="natal-sign-reveal__full-chart-link">
                See full chart
              </Link>
              {" "}
              to add them.
            </>
          ) : null}
        </p>
      ) : null}
    </section>
  );
}
