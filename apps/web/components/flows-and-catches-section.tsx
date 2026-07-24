"use client";

/**
 * Shared "Where it flows and catches" section for Quick Compare
 * (/chart/compare), compare share snapshots (/s/[token]), and authenticated
 * Compare (/app/compare). One markup path — all three surfaces inherit.
 * Does not recompute orbs; reads aspect.orb from the live result or stored
 * snapshot payload.
 */

import {
  aspectActionParts,
  interpretSynastryAspect,
  orbStrength,
  relationLensCaption,
  sortAspectsForFocus,
  type AspectKey,
  type BodyKey,
  type RelationType,
} from "@galaxia/astro";
import { useState } from "react";

export type FlowsCatchesAspect = {
  from: string;
  to: string;
  type: string;
  orb: number;
  harmony: number;
};

// FOUNDER-REVIEW: authored — Quick Compare flows/catches intro (romantic).
const INTRO_ROMANTIC = "The strongest currents between you two, strongest first.";
// FOUNDER-REVIEW: authored — Quick Compare flows/catches intro (platonic / non-romantic).
const INTRO_PLATONIC = "What runs strongest between you two, strongest first.";
// FOUNDER-REVIEW: authored — flows vs catches legend (once per section).
const FLOWS_CATCHES_LEGEND =
  "Flows are what comes easily between you. Catches are where you two snag, and usually where the growth is.";
// FOUNDER-REVIEW: authored — closed-by-default disclosure for dense aspect notation.
const SHOW_ASPECT_DETAIL = "▶ Show aspect detail";
// FOUNDER-REVIEW: authored — disclosure close label (mirrors See full chart).
const HIDE_ASPECT_DETAIL = "▼ Hide aspect detail";

type Props = {
  aspects: FlowsCatchesAspect[];
  relationType: RelationType;
};

function introFor(relationType: RelationType): string {
  if (relationType === "romantic") return INTRO_ROMANTIC;
  if (relationType === "platonic") return INTRO_PLATONIC;
  // Authenticated Compare types keep the existing type-lens caption.
  return relationLensCaption(relationType);
}

export function FlowsAndCatchesSection({ aspects, relationType }: Props) {
  const [showDetail, setShowDetail] = useState(false);
  // Full RelationType focus sort — romantic/platonic and /app/compare types alike.
  const ordered = sortAspectsForFocus(
    aspects.filter((a) => a.from !== a.to).sort((a, b) => a.orb - b.orb),
    relationType
  ).slice(0, 6);

  const intro = introFor(relationType);

  // Keep aspect order identical. Show each register opener once at the top of
  // its logical group (before the first flows row / first catches row); every
  // subsequent row in that group renders only the tactic tail.
  let seenFlowsOpener = false;
  let seenCatchesOpener = false;
  const rows = ordered.map((a, idx) => {
    const reading = interpretSynastryAspect(
      a.from.toLowerCase() as BodyKey,
      a.to.toLowerCase() as BodyKey,
      a.type.toLowerCase() as AspectKey
    );
    const { flows, opener, tactic } = aspectActionParts(a, relationType);
    const showOpener = flows ? !seenFlowsOpener : !seenCatchesOpener;
    if (flows) seenFlowsOpener = true;
    else seenCatchesOpener = true;
    return {
      key: `${a.from}-${a.to}-${idx}`,
      a,
      readingShort: reading.short,
      flows,
      opener,
      tactic,
      showOpener,
      strength: orbStrength(a.orb),
    };
  });

  return (
    <section className="glass-card fade-in fade-in-delay-2">
      <p className="eyebrow" style={{ marginBottom: 10 }}>Where it flows and catches</p>
      <p className="muted" style={{ fontSize: ".72rem", marginBottom: 6 }}>
        {intro}
      </p>
      <p className="muted" style={{ fontSize: ".72rem", marginBottom: 10, lineHeight: 1.5 }}>
        {FLOWS_CATCHES_LEGEND}
      </p>
      {rows.map((row, idx) => (
        <div key={row.key}>
          {row.showOpener ? (
            <p
              style={{
                fontSize: ".78rem",
                color: "var(--cream)",
                lineHeight: 1.5,
                margin: idx === 0 ? "0 0 4px" : "12px 0 4px",
                fontWeight: 600,
              }}
            >
              {row.opener}
            </p>
          ) : null}
          <div style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span
                style={{
                  fontSize: ".8rem",
                  color: row.flows ? "var(--teal)" : "var(--rose)",
                  flexShrink: 0,
                }}
              >
                {row.flows ? "↑ flows" : "↓ catches"}
              </span>
              <span className="muted" style={{ fontSize: ".74rem", fontStyle: "italic" }}>
                {row.readingShort}
              </span>
            </div>
            <p style={{ fontSize: ".78rem", color: "var(--cream)", lineHeight: 1.55, margin: "5px 0 0" }}>
              <span style={{ color: row.flows ? "var(--teal)" : "var(--gold)", fontWeight: 600 }}>
                {row.flows ? "Nurture it: " : "Ease it: "}
              </span>
              {row.tactic}.
            </p>
          </div>
        </div>
      ))}

      {rows.length > 0 ? (
        <div style={{ marginTop: 12 }}>
          <button
            type="button"
            className="pill-link"
            onClick={() => setShowDetail((v) => !v)}
            style={{ fontSize: ".82rem", marginBottom: showDetail ? 10 : 0 }}
          >
            {showDetail ? HIDE_ASPECT_DETAIL : SHOW_ASPECT_DETAIL}
          </button>
          {showDetail ? (
            <div style={{ display: "grid", gap: 0 }}>
              {rows.map((row) => (
                <div
                  key={`detail-${row.key}`}
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 8,
                    padding: "7px 0",
                    borderBottom: "1px solid rgba(255,255,255,.04)",
                  }}
                >
                  <span
                    style={{
                      fontSize: ".8rem",
                      color: row.flows ? "var(--teal)" : "var(--rose)",
                      flexShrink: 0,
                      minWidth: 60,
                    }}
                  >
                    {row.flows ? "↑ flows" : "↓ catches"}
                  </span>
                  <span className="muted" style={{ fontSize: ".82rem" }}>
                    {row.a.from} {row.a.type} {row.a.to}
                  </span>
                  <span
                    style={{
                      marginLeft: "auto",
                      flexShrink: 0,
                      textAlign: "right",
                      lineHeight: 1.2,
                    }}
                    title={`${row.a.orb.toFixed(1)}°`}
                  >
                    <span
                      style={{
                        display: "block",
                        fontSize: ".78rem",
                        fontWeight: 600,
                        color: "var(--cream)",
                        textTransform: "lowercase",
                      }}
                    >
                      {row.strength}
                    </span>
                    <span className="muted" style={{ display: "block", fontSize: ".64rem" }}>
                      {row.a.orb.toFixed(1)}°
                    </span>
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
