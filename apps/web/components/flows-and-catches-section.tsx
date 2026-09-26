"use client";

/**
 * Shared "Where it flows and catches" section for Quick Compare
 * (/chart/compare), compare share snapshots (/s/[token]), and authenticated
 * Compare (/app/compare). One markup path — all three surfaces inherit.
 * Does not recompute orbs; reads aspect.orb from the live result or stored
 * snapshot payload.
 */

import {
  ADJUST_BADGE,
  ADJUST_TACTIC_PREFIX,
  aspectActionParts,
  interpretSynastryAspect,
  isRomanticRelation,
  orbStrength,
  relationLensCaption,
  relationshipAspectFraming,
  selectCompareAspectRows,
  type AspectGroup,
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
  phase?: string;
};

const INTRO_ROMANTIC = "The strongest currents between you two, strongest first.";
const INTRO_PLATONIC = "What runs strongest between you two, strongest first.";
const FLOWS_CATCHES_LEGEND =
  "Flows are what comes easily between you. Catches are where you two snag, and usually where the growth is.";
/* FOUNDER-REVIEW */
const ADJUSTS_LEGEND =
  "Adjusts are a persistent mismatch. Name the gap, then change the angle of approach.";
const SHOW_ASPECT_DETAIL = "▶ Show aspect detail";
const HIDE_ASPECT_DETAIL = "▼ Hide aspect detail";

type Props = {
  aspects: FlowsCatchesAspect[];
  relationType: RelationType;
  /** Real display names, needed only for the relationshipAspectFraming() revival below. */
  nameA: string;
  nameB: string;
};

function introFor(relationType: RelationType): string {
  if (isRomanticRelation(relationType)) return INTRO_ROMANTIC;
  if (relationType === "platonic") return INTRO_PLATONIC;
  // Authenticated Compare types keep the existing type-lens caption.
  return relationLensCaption(relationType);
}

export function FlowsAndCatchesSection({ aspects, relationType, nameA, nameB }: Props) {
  const [showDetail, setShowDetail] = useState(false);
  // Full RelationType focus sort. Drops same-body and duplicate unordered
  // pair+type rows so two directions of one pair cannot render identical copy.
  const ordered = selectCompareAspectRows(aspects, relationType, 6);

  const intro = introFor(relationType);

  // Revived RELATION_ASPECT_FRAME readings (previously dropped in
  // cursor/compare-biwheel-aspect-disclosure-0120). Only the `text` field is
  // rendered: `action` is discarded because it is literally the same
  // opener+tactic pair the rows below already render via aspectActionParts,
  // so surfacing it again would be word-for-word repetition.
  const framing = relationshipAspectFraming(
    { aspects: aspects.filter((a) => a.from !== a.to) } as never,
    relationType,
    nameA,
    nameB
  );

  const GROUP_ORDER: AspectGroup[] = ["flows", "catches", "adjusts"];
  const mapped = ordered.map((a, idx) => {
    const reading = interpretSynastryAspect(
      a.from.toLowerCase() as BodyKey,
      a.to.toLowerCase() as BodyKey,
      a.type.toLowerCase() as AspectKey
    );
    const { flows, adjusts, group, opener, tactic } = aspectActionParts(a, relationType);
    return {
      key: `${a.from}-${a.to}-${idx}`,
      a,
      readingShort: reading.short,
      flows,
      adjusts,
      group,
      opener,
      tactic,
      strength: orbStrength(a.orb),
    };
  });
  const rows = GROUP_ORDER.flatMap((group) =>
    mapped
      .filter((row) => row.group === group)
      .sort((x, y) => x.a.orb - y.a.orb)
      .map((row, idx) => ({ ...row, showOpener: idx === 0 }))
  );

  function groupChrome(group: AspectGroup): { badge: string; color: string; prefix: string; prefixColor: string } {
    if (group === "flows") {
      return { badge: "↑ flows", color: "var(--teal)", prefix: "Nurture it: ", prefixColor: "var(--teal)" };
    }
    if (group === "catches") {
      return { badge: "↓ catches", color: "var(--rose)", prefix: "Ease it: ", prefixColor: "var(--gold)" };
    }
    return { badge: ADJUST_BADGE, color: "var(--gold)", prefix: `${ADJUST_TACTIC_PREFIX} `, prefixColor: "var(--gold)" };
  }

  return (
    <section className="glass-card fade-in fade-in-delay-2">
      <p className="eyebrow" style={{ marginBottom: 10 }}>Where it flows and catches</p>
      <p className="muted" style={{ fontSize: ".72rem", marginBottom: 6 }}>
        {intro}
      </p>
      <p className="muted" style={{ fontSize: ".72rem", marginBottom: 6, lineHeight: 1.5 }}>
        {FLOWS_CATCHES_LEGEND}
      </p>
      <p className="muted" style={{ fontSize: ".72rem", marginBottom: 10, lineHeight: 1.5 }}>
        {ADJUSTS_LEGEND}
      </p>
      {rows.map((row, idx) => {
        const chrome = groupChrome(row.group);
        return (
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
                  color: chrome.color,
                  flexShrink: 0,
                }}
              >
                {chrome.badge}
              </span>
              <span className="muted" style={{ fontSize: ".74rem", fontStyle: "italic" }}>
                {row.readingShort}
              </span>
            </div>
            <p style={{ fontSize: ".78rem", color: "var(--cream)", lineHeight: 1.55, margin: "5px 0 0" }}>
              <span style={{ color: chrome.prefixColor, fontWeight: 600 }}>
                {chrome.prefix}
              </span>
              {row.tactic}.
            </p>
          </div>
        </div>
        );
      })}

      {framing.length > 0 ? (
        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          {framing.map((f, idx) => (
            <p
              key={`framing-${idx}`}
              style={{
                fontSize: ".82rem",
                color: "var(--mist)",
                lineHeight: 1.6,
                fontStyle: "italic",
                margin: 0,
                borderLeft: `2px solid ${f.flows ? "rgba(111,177,184,.4)" : "rgba(200,120,120,.4)"}`,
                paddingLeft: 12,
              }}
            >
              {f.text}
            </p>
          ))}
        </div>
      ) : null}

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
                      color: groupChrome(row.group).color,
                      flexShrink: 0,
                      minWidth: 60,
                    }}
                  >
                    {groupChrome(row.group).badge}
                  </span>
                  <span className="muted" style={{ fontSize: ".82rem" }}>
                    {row.a.from} {row.a.type} {row.a.to}
                    {row.a.phase ? ` · ${row.a.phase}` : ""}
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
