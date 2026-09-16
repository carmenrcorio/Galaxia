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

import {
  HOUSES_UNAVAILABLE_EYEBROW,
  housesUnavailableCopy,
} from "@galaxia/core";
import type { Precision } from "@galaxia/astro";
import type { CSSProperties, ReactNode } from "react";

export {
  HOUSES_UNAVAILABLE_DATE_BODY,
  HOUSES_UNAVAILABLE_DATE_FOLLOW_UP,
  HOUSES_UNAVAILABLE_EXACT_BODY,
  HOUSES_UNAVAILABLE_EXACT_FOLLOW_UP,
  HOUSES_UNAVAILABLE_EYEBROW,
  HOUSES_UNAVAILABLE_YEAR_BODY,
  HOUSES_UNAVAILABLE_YEAR_FOLLOW_UP,
  housesUnavailableCopy,
} from "@galaxia/core";

export function HousesUnavailableCard({
  hasHouses,
  precision,
  eyebrow = HOUSES_UNAVAILABLE_EYEBROW,
  title,
  id = "houses",
  className = "glass-card fade-in fade-in-delay-2",
  style,
  action,
}: {
  hasHouses: boolean;
  precision: Precision;
  eyebrow?: string;

  title?: string;
  id?: string;
  className?: string;
  style?: CSSProperties;
  /** Single upgrade action. Shown once in this empty state. */
  action?: ReactNode;
}) {
  if (hasHouses) return null;

  const copy = housesUnavailableCopy(precision);

  return (
    <section
      id={id}
      className={className}
      style={{ borderStyle: "dashed", opacity: 0.7, scrollMarginTop: 92, ...style }}
    >
      {title ? <p className="eyebrow" style={{ marginBottom: 2 }}>{title}</p> : null}
      <p className={title ? "chart-vocab-subhead" : "eyebrow"} style={title ? undefined : { marginBottom: 6 }}>{eyebrow}</p>
      <p className="muted" style={{ fontSize: ".82rem", lineHeight: 1.6 }}>
        {copy.body}
      </p>
      <p className="muted" style={{ fontSize: ".78rem", marginTop: 8 }}>
        {copy.followUp}
      </p>
      {action ? <div style={{ marginTop: 10 }}>{action}</div> : null}
    </section>
  );
}
