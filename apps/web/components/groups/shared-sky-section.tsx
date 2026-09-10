"use client";

/**
 * Shared Sky section. Renders full-group lines and partial-cluster lines
 * together (per planet, never either-or). Planet and sign names are
 * glossary-wrapped. Sentences come from `sharedSkyLines` (static copy).
 */

import { Fragment } from "react";
import { BODY_GLYPH, SIGN_GLYPH } from "../../lib/design";
import {
  SHARED_SKY_NO_OVERLAP_NOTE,
  joinNames,
  sharedSkyLines,
  type CohortOverlayLike,
  type SharedSkyLine,
} from "../../lib/groups-copy";
import { GlossaryPlanet, GlossarySign } from "../glossary-term";

interface SharedSkySectionProps {
  overlay: CohortOverlayLike;
  totalMembers: number;
}

export function SharedSkySection({ overlay, totalMembers }: SharedSkySectionProps) {
  const lines = sharedSkyLines(overlay, totalMembers);

  return (
    <section className="glass-card fade-in">
      <p className="eyebrow" style={{ marginBottom: 10 }}>Shared sky</p>
      {lines.length > 0 ? (
        <div style={{ display: "grid", gap: 12 }}>
          {lines.map((line) => (
            <SharedSkyLineView key={line.key} line={line} />
          ))}
        </div>
      ) : (
        <p className="muted" style={{ fontSize: ".86rem", lineHeight: 1.6 }}>{SHARED_SKY_NO_OVERLAP_NOTE}</p>
      )}
    </section>
  );
}

function SharedSkyLineView({ line }: { line: SharedSkyLine }) {
  const glyphPlanet = line.placements[0]?.planet;
  return (
    <div className="pl-row" style={{ alignItems: "flex-start" }}>
      {glyphPlanet ? (
        <div className="glyph-sq" style={{ fontSize: ".9rem" }} aria-hidden="true">
          {BODY_GLYPH[glyphPlanet]}
        </div>
      ) : null}
      <p className="muted" style={{ fontSize: ".86rem", lineHeight: 1.6, margin: 0 }}>
        {line.coverage === "whole" ? "Everyone shares " : `${joinNames(line.names)} share `}
        {line.placements.map((placement, index) => {
          const total = line.placements.length;
          const sep =
            index === 0 ? null : total === 2 ? " and " : index === total - 1 ? ", and " : ", ";
          return (
            <Fragment key={`${placement.planet}-${placement.sign}`}>
              {sep}
              <GlossaryPlanet planet={placement.planet} />
              {" in "}
              <span aria-hidden="true">{SIGN_GLYPH[placement.sign]} </span>
              <GlossarySign sign={placement.sign} />
            </Fragment>
          );
        })}
        {line.gloss ? `: ${line.gloss}. ` : ". "}
        {line.tail}
      </p>
    </div>
  );
}
