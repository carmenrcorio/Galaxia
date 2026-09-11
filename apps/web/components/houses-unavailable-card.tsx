"use client";

/**
 * Dashed houses explanation card. Shown whenever a natal reading has no
 * house cusps. One component, every surface: person page, Quick Chart
 * (/chart), and share snapshots (/s). Callers always mount it and pass
 * `hasHouses`; the card renders nothing when houses are present, so a
 * year-only chart cannot fall through to a blank gap.
 *
 * Copy is keyed by precision so the card names the real missing input
 * (ENGINEERING.md §12): a year-only chart needs a birth date and a time;
 * a date-precision chart needs a birth time. Nothing is missing from the
 * reading. Less was known.
 */

import type { Precision } from "@galaxia/astro";
import type { CSSProperties } from "react";

export const HOUSES_UNAVAILABLE_EYEBROW = "The twelve houses";

// FOUNDER-REVIEW: authored — houses unavailable (year precision).
export const HOUSES_UNAVAILABLE_YEAR_BODY =
  "The house layer needs a birth date and a time. Right now only the sign layer that a year can settle is visible: how each planet behaves, not where it lives in this life. Nothing is missing from the reading. Less was known.";

// FOUNDER-REVIEW: authored — houses unavailable (year precision), follow-up.
export const HOUSES_UNAVAILABLE_YEAR_FOLLOW_UP =
  "Add a birth date and a time, and the houses, Ascendant, and Midheaven will compute.";

// FOUNDER-REVIEW: authored — houses unavailable (date precision).
export const HOUSES_UNAVAILABLE_DATE_BODY =
  "The house layer needs a birth time. Right now only the sign layer is visible: how each planet behaves, not where it lives in this life. Nothing is missing from the reading. Less was known.";

// FOUNDER-REVIEW: authored — houses unavailable (date precision), follow-up.
export const HOUSES_UNAVAILABLE_DATE_FOLLOW_UP =
  "Add a birth time and city, and the houses, Ascendant, and Midheaven will compute.";

// FOUNDER-REVIEW: authored — houses unavailable (exact time, no place).
export const HOUSES_UNAVAILABLE_EXACT_BODY =
  "The house layer needs a birth city. Time is known, but houses also need a place. Nothing is missing from the reading. Less was known.";

// FOUNDER-REVIEW: authored — houses unavailable (exact time, no place), follow-up.
export const HOUSES_UNAVAILABLE_EXACT_FOLLOW_UP =
  "Add a birth city, and the houses, Ascendant, and Midheaven will compute.";

export function housesUnavailableCopy(precision: Precision): { body: string; followUp: string } {
  if (precision === "year") {
    return { body: HOUSES_UNAVAILABLE_YEAR_BODY, followUp: HOUSES_UNAVAILABLE_YEAR_FOLLOW_UP };
  }
  if (precision === "exact") {
    return { body: HOUSES_UNAVAILABLE_EXACT_BODY, followUp: HOUSES_UNAVAILABLE_EXACT_FOLLOW_UP };
  }
  return { body: HOUSES_UNAVAILABLE_DATE_BODY, followUp: HOUSES_UNAVAILABLE_DATE_FOLLOW_UP };
}

export function HousesUnavailableCard({
  hasHouses,
  precision,
  eyebrow = HOUSES_UNAVAILABLE_EYEBROW,
  id = "houses",
  className = "glass-card fade-in fade-in-delay-2",
  style,
}: {
  hasHouses: boolean;
  precision: Precision;
  eyebrow?: string;
  id?: string;
  className?: string;
  style?: CSSProperties;
}) {
  if (hasHouses) return null;

  const copy = housesUnavailableCopy(precision);

  return (
    <section
      id={id}
      className={className}
      style={{ borderStyle: "dashed", opacity: 0.7, scrollMarginTop: 92, ...style }}
    >
      <p className="eyebrow" style={{ marginBottom: 6 }}>{eyebrow}</p>
      <p className="muted" style={{ fontSize: ".82rem", lineHeight: 1.6 }}>
        {copy.body}
      </p>
      <p className="muted" style={{ fontSize: ".78rem", marginTop: 8 }}>
        {copy.followUp}
      </p>
    </section>
  );
}
