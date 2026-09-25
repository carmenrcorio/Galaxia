"use client";

/**
 * Natal sign reveal — Sun / Moon / Rising chips with short readings.
 *
 * Shared by the landing mini-form, public Quick Chart (/chart), and single
 * share snapshots (/s). Labels only placements the chart actually has; an
 * absent Rising is never presented as a third computed sign.
 *
 * Minor safety: when `birthDate` is provided, calls isMinorForSafety and passes
 * the result into interpretPlacement's required minorSafe flag. Natal Sun/Moon
 * copy is not adults-only — minor and adult render identically today. Gift
 * shares pass birthDate from the allowlisted giftBirth envelope when present;
 * older snapshots omit it and therefore pass minorSafe: true (fail-safe).
 * Do not persist a minor flag on single shares.
 */

import { type NatalChart } from "@galaxia/astro";
import { isMinorForSafety } from "@galaxia/core";
import Link from "next/link";
import type { Route } from "next";
import type { CSSProperties } from "react";
import { FlipSignCards } from "./flip-sign-cards";

export type NatalSignRevealProps = {
  chart: NatalChart;
  displayDate: string;
  birthPlace?: string | null;
  /** Local display only — never required; /s singles are nameless. */
  name?: string;
  /**
   * When set, run isMinorForSafety (same call shape as Quick Compare / save).
   * Gift shares pass this from giftBirth; older /s rows omit it.
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
  // Fail-safe when birthDate is omitted (older /s rows, or landing without
  // a date): treat as minor for the required PlacementSafetyOpts flag.
  // for the required PlacementSafetyOpts flag. Sun/Moon copy is identical either
  // way today; Venus never renders here.
  const minorSafe = birthDate
    ? isMinorForSafety({
        isMinor: false,
        birthDate,
        birthPrecision: birthPrecision ?? "date",
      })
    : true;

  const rising = chart.asc;
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

      <div style={{ margin: "14px 0" }}>
        <FlipSignCards chart={chart} minorSafe={minorSafe} />
      </div>

      {signupHref ? (
        <div className="natal-sign-reveal__signup" style={{ marginTop: 4, marginBottom: rising ? 0 : 10 }}>
                    <Link href={signupHref as Route} className="btn-primary">
            Start 14 days free
          </Link>
        </div>
      ) : null}

      {!rising ? (
        <p className="muted natal-sign-reveal__rising-note" style={{ fontSize: ".76rem", marginTop: 8, lineHeight: 1.5 }}>
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
