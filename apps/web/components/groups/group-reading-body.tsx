"use client";

/**
 * Shared Groups reading panels (quote, map, shared sky, fault lines,
 * pair dynamics, chart grid). Used by a saved/preview group and by the
 * labelled empty-state example so both surfaces cannot drift.
 */

import { type FamilyComparePersonInput } from "@galaxia/astro";
import { sunSignFromChart } from "@galaxia/core";
import type { ReactNode } from "react";
import { GlossaryPlanet, GlossarySign } from "../glossary-term";
import { BODY_GLYPH, SIGN_GLYPH } from "../../lib/design";
import {
  faultLinesInterpretation,
  GEN_PLANET_MEANING,
  type CohortOverlayLike,
  type GenPlanetKey,
} from "../../lib/groups-copy";
import { ChartGridSection } from "./chart-grid-section";
import { GenerationalMap } from "./generational-map";
import { PairDynamicsSection, type PairDynamicsItem } from "./pair-dynamics-section";
import { SharedSkySection } from "./shared-sky-section";

export interface GroupReadingCohort {
  memberNames: string[];
  memberIds: string[];
  overlay: CohortOverlayLike & { label: string };
  pairHighlights: PairDynamicsItem[];
}

interface GroupReadingBodyProps {
  cohort: GroupReadingCohort;
  chartGridMembers: FamilyComparePersonInput[];
  readingActions?: ReactNode;
  resolvePairPersonId: (name: string) => string | null;
  onOpenPair: (idA: string, idB: string) => void;
  allowShare?: boolean;
}

export function GroupReadingBody({
  cohort,
  chartGridMembers,
  readingActions,
  resolvePairPersonId,
  onOpenPair,
  allowShare = true,
}: GroupReadingBodyProps) {
  const chipPeople = cohort.memberNames.map((name, i) => {
    const id = cohort.memberIds[i] ?? name;
    const grid = chartGridMembers.find((m) => m.id === id || m.name === name);
    return {
      id,
      name,
      sunSign: grid ? sunSignFromChart(grid.chart) : undefined,
      memorial: grid?.passed,
    };
  });

  return (
    <>
      <section className="glass-card fade-in fade-in-delay-1">
        <p className="eyebrow" style={{ marginBottom: 10 }}>Group reading</p>
        <p style={{
          fontFamily: "var(--serif)", fontSize: "1.12rem", lineHeight: 1.65, color: "var(--cream)",
          fontStyle: "italic", borderLeft: "2px solid rgba(230,174,108,.3)", paddingLeft: 16, margin: "0 0 22px",
        }}>
          {cohort.overlay.label}
        </p>
        {readingActions}
      </section>

      <GenerationalMap memberNames={cohort.memberNames} overlay={cohort.overlay} chipPeople={chipPeople} />

      <SharedSkySection overlay={cohort.overlay} totalMembers={cohort.memberIds.length} />

      {cohort.overlay.faultLines.length > 0 ? (
        <section className="teal-callout fade-in">
          <p className="eyebrow" style={{ marginBottom: 10 }}>Fault lines</p>
          <p className="muted" style={{ fontSize: ".86rem", lineHeight: 1.6, marginBottom: 18 }}>
            {faultLinesInterpretation(cohort.overlay.faultLines)}
          </p>
          {cohort.overlay.faultLines.map((line) => (
            <div key={line.planet} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: "1.3rem", color: "var(--gold-soft)" }} aria-hidden="true">{BODY_GLYPH[line.planet]}</span>
                <GlossaryPlanet planet={line.planet}>
                  <strong style={{ color: "var(--teal)", letterSpacing: ".04em" }}>{line.planet.toUpperCase()}</strong>
                </GlossaryPlanet>
              </div>
              <p className="muted" style={{ fontSize: ".76rem", fontStyle: "italic", marginLeft: 34, marginBottom: 8 }}>
                {GEN_PLANET_MEANING[line.planet as GenPlanetKey] ?? "a distinctive generational signature"}
              </p>
              {line.groups.map((g) => (
                <div key={`${line.planet}-${g.sign}`} style={{ marginLeft: 34, marginBottom: 4 }}>
                  <span style={{ color: "var(--cream)", fontWeight: 600 }}>
                    <span aria-hidden="true">{SIGN_GLYPH[g.sign]} </span>
                    <GlossarySign sign={g.sign} />
                  </span>
                  <span className="muted" style={{ fontSize: 13 }}>: {g.names.join(", ")}</span>
                </div>
              ))}
            </div>
          ))}
        </section>
      ) : null}

      <PairDynamicsSection
        items={cohort.pairHighlights}
        resolveId={resolvePairPersonId}
        onOpenPair={onOpenPair}
      />

      <ChartGridSection members={chartGridMembers} allowShare={allowShare} />
    </>
  );
}
