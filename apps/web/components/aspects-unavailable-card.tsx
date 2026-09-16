"use client";

/**
 * Aspects explanation card for a natal reading that cannot place
 * planet-to-planet lines honestly (year-only). Same shape as
 * HousesUnavailableCard: name the missing input in place, never a blank gap.
 */

import {
  ASPECTS_UNAVAILABLE_YEAR_BODY,
  ASPECTS_UNAVAILABLE_YEAR_FOLLOW_UP,
} from "@galaxia/core";
import type { CSSProperties, ReactNode } from "react";

export const ASPECTS_UNAVAILABLE_EYEBROW = "Aspects";

export function AspectsUnavailableCard({
  precision,
  eyebrow = ASPECTS_UNAVAILABLE_EYEBROW,
  title,
  id = "aspects",
  className = "glass-card fade-in fade-in-delay-2",
  style,
  action,
}: {
  precision: string;
  eyebrow?: string;

  title?: string;
  id?: string;
  className?: string;
  style?: CSSProperties;
  /** Single upgrade action. Shown once in this empty state. */
  action?: ReactNode;
}) {
  if (precision !== "year") return null;

  return (
    <section
      id={id}
      className={className}
      style={{ borderStyle: "dashed", opacity: 0.7, scrollMarginTop: 92, ...style }}
    >
      {title ? <p className="eyebrow" style={{ marginBottom: 2 }}>{title}</p> : null}
      <p className={title ? "chart-vocab-subhead" : "eyebrow"} style={title ? undefined : { marginBottom: 6 }}>{eyebrow}</p>
            <p className="muted" style={{ fontSize: ".82rem", lineHeight: 1.6 }}>
        {ASPECTS_UNAVAILABLE_YEAR_BODY}
      </p>
            <p className="muted" style={{ fontSize: ".78rem", marginTop: 8 }}>
        {ASPECTS_UNAVAILABLE_YEAR_FOLLOW_UP}
      </p>
      {action ? <div style={{ marginTop: 10 }}>{action}</div> : null}
    </section>
  );
}
