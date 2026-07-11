"use client";

/**
 * "Download as PDF" — the paid perk (Phase 3).
 *
 * DECISION (see CHANGELOG): the public share link stays free (it is the
 * acquisition funnel); the PDF export is the subscriber perk. This button is
 * ONLY rendered by callers that have confirmed the real entitlement
 * (@galaxia/core hasAccess via useViewer.isSubscriber) — an anonymous visitor
 * never sees it.
 *
 * Approach (lightest per Phase 0): browser print-to-PDF. No PDF library, no
 * server route, nothing added to next.config/.npmrc. On click we call
 * window.print(); a dedicated `@media print` block in globals.css hides the
 * live app and reveals a clean, on-brand chart document. That document is
 * rendered through a portal into <body> so it is a direct body child and can
 * be isolated in print with `body > *:not(.chart-pdf-root){display:none}`.
 * It is display:none on screen, so it never affects the interactive page.
 *
 * No fabrication (§12): the document renders only what the engine computed —
 * uncertain placements are hedged exactly as the on-screen chart hedges them,
 * the wheel is omitted when there are no house cusps, and the house-system
 * label is derived from the chart data, never asserted.
 */

import type { NatalChart } from "@galaxia/astro";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BODY_GLYPH, SIGN_GLYPH, signElement } from "../lib/design";
import { CHART_ENGINE_VERSION, houseSystemLabelForChart } from "../lib/house-system";
import { BODY_DOMAIN, interpretPlacement, interpretRising, type BodyKey, type SignKey } from "../lib/interpretations";
import { ChartWheel } from "./chart-wheel";

interface ChartPdfExportProps {
  chart: NatalChart;
  name?: string;
  displayDate: string;
  birthPlace: string | null;
  engineVersion?: number;
}

export function ChartPdfExport({ chart, name, displayDate, birthPlace, engineVersion = CHART_ENGINE_VERSION }: ChartPdfExportProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <>
      <button type="button" className="btn-primary no-print" onClick={() => window.print()} style={{ gap: 8 }}>
        Download as PDF
      </button>
      {mounted
        ? createPortal(
            <ChartPdfDocument chart={chart} name={name} displayDate={displayDate} birthPlace={birthPlace} engineVersion={engineVersion} />,
            document.body
          )
        : null}
    </>
  );
}

function ChartPdfDocument({ chart, name, displayDate, birthPlace, engineVersion }: Required<Pick<ChartPdfExportProps, "chart" | "displayDate" | "engineVersion">> & Pick<ChartPdfExportProps, "name" | "birthPlace">) {
  const sun = chart.placements.find((p) => p.body === "sun");
  const moon = chart.placements.find((p) => p.body === "moon");
  const rising = chart.asc;
  const hasHouses = chart.cusps != null && chart.cusps.length >= 12;

  const bigThree: { label: string; sign?: string; reading?: string }[] = [
    { label: "Sun", sign: sun && sun.confident !== false ? sun.sign : undefined, reading: sun && sun.confident !== false ? interpretPlacement("sun", sun.sign as SignKey).short : undefined },
    { label: "Moon", sign: moon && moon.confident !== false ? moon.sign : undefined, reading: moon && moon.confident !== false ? interpretPlacement("moon", moon.sign as SignKey).short : undefined },
    { label: "Rising", sign: rising, reading: rising ? interpretRising(rising as SignKey).short : undefined },
  ];

  return (
    <div className="chart-pdf-root" aria-hidden="true">
      <div className="pdf-page">
        <div className="pdf-header">
          <span className="pdf-brand">Galax<span style={{ fontStyle: "italic", fontWeight: 500 }}>ia</span></span>
          <span className="pdf-eyebrow">Natal Chart</span>
        </div>

        <h1 className="pdf-title">{name?.trim() || "Birth chart"}</h1>
        <p className="pdf-meta">
          {displayDate}{birthPlace ? ` · ${birthPlace}` : ""}
        </p>

        {hasHouses ? (
          <div className="pdf-wheel-panel">
            <ChartWheel chart={chart} />
          </div>
        ) : null}

        <div className="pdf-bigthree">
          {bigThree.map(({ label, sign, reading }) => (
            <div key={label} className="pdf-chip">
              <span className="pdf-chip-glyph" style={{ color: sign ? `var(--${signElement(sign)})` : undefined }}>
                {sign ? SIGN_GLYPH[sign] : "—"}
              </span>
              <span className="pdf-chip-label">{label}</span>
              <span className="pdf-chip-value">{sign ?? (label === "Rising" ? "Needs time + city" : "—")}</span>
              {reading ? <span className="pdf-chip-reading">{reading}</span> : null}
            </div>
          ))}
        </div>

        <div className="pdf-placements">
          <p className="pdf-section-title">Placements</p>
          {chart.placements.map((p) => {
            if (p.confident === false) {
              return (
                <div key={p.body} className="pdf-placement pdf-placement--uncertain">
                  <span className="pdf-placement-glyph">{BODY_GLYPH[p.body] ?? p.body[0]}</span>
                  <span className="pdf-placement-uncertain-text">
                    {p.body[0].toUpperCase() + p.body.slice(1)} — sign uncertain; a birth date would settle it.
                  </span>
                </div>
              );
            }
            const reading = interpretPlacement(p.body as BodyKey, p.sign as SignKey);
            return (
              <div key={p.body} className="pdf-placement">
                <span className="pdf-placement-glyph" style={{ color: `var(--${signElement(p.sign)})` }}>{BODY_GLYPH[p.body] ?? p.body[0]}</span>
                <div className="pdf-placement-body">
                  <div className="pdf-placement-domain">{BODY_DOMAIN[p.body as BodyKey]}</div>
                  <div className="pdf-placement-name">{p.body[0].toUpperCase() + p.body.slice(1)} in {p.sign}</div>
                  {reading.short ? <div className="pdf-placement-reading">{reading.short}</div> : null}
                </div>
              </div>
            );
          })}
        </div>

        <p className="pdf-footnote">
          {hasHouses
            ? `Houses computed with the ${houseSystemLabelForChart(chart, engineVersion)} system. `
            : "Add an exact birth time and city to unlock the Ascendant, houses, and the full wheel. "}
          Computed from precise astronomical data by Galaxia — never guessed.
        </p>
      </div>
    </div>
  );
}
