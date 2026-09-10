"use client";

/**
 * Shared "Your dynamic" ratings table for Quick Compare (/chart/compare)
 * and compare share snapshots (/s/[token]). One markup path — both surfaces
 * inherit. Words/bands from compatWord; colors from compat-high|mid|low CSS.
 * Does not re-derive scores or override band colors.
 */

import type { ReactNode } from "react";
import { DynamicScoresTable, type DynamicScores } from "./dynamic-scores-table";

// FOUNDER-REVIEW: authored — ease-scale legend for Your dynamic ratings table.
const DYNAMIC_SCALE_LEGEND =
  "How to read this: these run from easiest to most effort. Gold comes naturally, teal takes a little tending, rose takes real work. Charged is the far end, the most friction between you, not the most spark.";

export type { DynamicScores };

type Props = {
  scores: DynamicScores;
  /** "What X needs from you" callouts (and any other section body). */
  children?: ReactNode;
};

export function DynamicTableSection({ scores, children }: Props) {
  return (
    <section className="glass-card fade-in fade-in-delay-1">
      <p className="eyebrow" style={{ marginBottom: 12 }}>Your dynamic</p>
      <p className="muted" style={{ fontSize: ".72rem", lineHeight: 1.5, marginBottom: 10 }}>
        {DYNAMIC_SCALE_LEGEND}
      </p>
      <div style={{ marginBottom: 14 }}>
        <DynamicScoresTable scores={scores} />
      </div>
      {children}
    </section>
  );
}
