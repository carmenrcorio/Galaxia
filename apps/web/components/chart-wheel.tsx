"use client";

/**
 * The natal chart wheel. Extracted from apps/web/app/app/person/[id]/page.tsx
 * so it can be reused by the public Quick Chart (/chart) without duplicating
 * the SVG geometry. Reference: design/reference/galaxia.jsx Wheel().
 *
 * Geometry lives in `@galaxia/core` `layoutChartWheel`. This file is the DOM
 * SVG paint path. Mobile uses the same layout through react-native-svg.
 *
 * Optional `overlayChart` draws a synastry bi-wheel: `chart` is the inner ring
 * and owns the house frame; overlay planets sit on the outer ring. When
 * `aspects` are passed (Compare), those lines are used — never recomputed.
 * Overlay without `aspects` is a loud empty state (note + dev warning), never
 * a silent void. Single-chart call sites stay one-arg and keep the internal
 * natal fallback when `aspects` is omitted; when `aspects` is passed (person
 * page), that list is drawn exactly.
 *
 * Colours: CSS custom properties from globals.css. Verified to survive the PDF
 * print path — chart-pdf-export already paints with `var(--${element})` in the
 * same portal'd document, and print uses the live DOM (not a var-stripping
 * serializer). Planet glyph *text* uses `--cream` for contrast; A/natal ring
 * stroke uses element colour, B (overlay) uses `--teal` so the two charts stay
 * distinct.
 */

import { computeSynastry, type NatalChart } from "@galaxia/astro";
import {
  COMPARE_WHEEL_NEEDS_HOUSES as CORE_COMPARE_WHEEL_NEEDS_HOUSES,
  OVERLAY_ASPECTS_MISSING_NOTE as CORE_OVERLAY_ASPECTS_MISSING_NOTE,
  YEAR_ASPECTS_NEED_DATE_NOTE,
  layoutChartWheel,
  orientSynastryWheel as coreOrientSynastryWheel,
  type WheelAspect as CoreWheelAspect,
  type WheelChartOwner,
} from "@galaxia/core";
import React, { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { designColor } from "../lib/design";

export const COMPARE_WHEEL_NEEDS_HOUSES = CORE_COMPARE_WHEEL_NEEDS_HOUSES;
export const OVERLAY_ASPECTS_MISSING_NOTE = CORE_OVERLAY_ASPECTS_MISSING_NOTE;
export const YEAR_ASPECTS_NOTE = YEAR_ASPECTS_NEED_DATE_NOTE;

export type WheelAspect = CoreWheelAspect;

export type ChartWheelProps = {
  chart: NatalChart;
  /** Second chart for synastry bi-wheel. Natal call sites omit this. */
  overlayChart?: NatalChart;
  /**
   * Already-computed aspects. Required path for overlay (Compare): from → chart
   * (inner/A), to → overlayChart (outer/B). Single-chart falls back to internal
   * natal self-aspects when omitted; when passed, drawn exactly (person page).
   */
  aspects?: WheelAspect[];
  /**
   * Pointer highlight (tap/hover). PDF/print passes false so highlight degrades
   * to a static wheel — no handlers, no focus state.
   */
  interactive?: boolean;
  /**
   * Swaps every `var(--x)` SVG colour for its literal hex (see
   * EXPORT_COLOR_LITERALS in lib/design.ts). Pass true whenever this wheel
   * sits inside an html-to-image raster capture — its SVG clone never
   * re-resolves custom properties on descendants, so `fill="var(--x)"`
   * would otherwise paint black in the exported PNG. Default false: zero
   * change to the live, on-screen wheel.
   */
  exportSafe?: boolean;
};

export function orientSynastryWheel(
  personA: { relation?: string | null },
  personB: { relation?: string | null },
  chartA: NatalChart,
  chartB: NatalChart,
  aspects: WheelAspect[],
) {
  return coreOrientSynastryWheel(personA, personB, chartA, chartB, aspects);
}

export function ChartWheel({ chart, overlayChart, aspects: aspectsProp, interactive = true, exportSafe = false }: ChartWheelProps) {
  const isOverlay = overlayChart != null;
  const natalPrecisionOk = chart.precision === "exact" || chart.precision === "date";
  const overlayWarnOnce = useRef(false);

  let natalFallbackAspects: WheelAspect[] | undefined;
  if (isOverlay) {
    // Overlay: only draw when Compare passes already-computed aspects.
  } else if (!natalPrecisionOk) {
    natalFallbackAspects = undefined;
  } else if (aspectsProp == null) {
    natalFallbackAspects = computeSynastry(chart, chart).aspects;
  }

  const layout = layoutChartWheel({
    chart,
    overlayChart,
    aspects: aspectsProp,
    natalFallbackAspects,
  });

  if (layout.overlayMissingAspects && !overlayWarnOnce.current) {
    overlayWarnOnce.current = true;
    console.warn(
      "[ChartWheel] overlayChart was mounted without aspects: synastry lines will not draw. Pass the already-computed Compare aspects."
    );
  }

  const [focus, setFocus] = useState<{ owner: WheelChartOwner; body: string } | null>(null);

  function lineDimmed(from: string, to: string): boolean {
    if (!interactive || !focus) return false;
    if (layout.isOverlay) {
      // Synastry shape: from = A (inner), to = B (outer).
      if (focus.owner === "a") return focus.body !== from;
      return focus.body !== to;
    }
    return focus.body !== from && focus.body !== to;
  }

  function onPlanetPointerEnter(owner: WheelChartOwner, body: string, e: ReactPointerEvent) {
    if (!interactive) return;
    if (e.pointerType === "touch") return;
    setFocus({ owner, body });
  }

  function onPlanetPointerLeave(e: ReactPointerEvent) {
    if (!interactive) return;
    if (e.pointerType === "touch") return;
    setFocus(null);
  }

  function onPlanetPointerUp(owner: WheelChartOwner, body: string, e: ReactPointerEvent) {
    if (!interactive) return;
    if (e.pointerType !== "touch") return;
    setFocus((prev) => (prev && prev.owner === owner && prev.body === body ? null : { owner, body }));
  }

  const color = (name: string) => designColor(name, exportSafe);

  return (
    <div style={{ width: "100%", maxWidth: 306, margin: "0 auto", paddingInline: 8 }}>
      <svg viewBox={`0 0 ${layout.size} ${layout.size}`} width="100%" style={{ display: "block", overflow: "visible" }}>
        <circle cx={layout.cx} cy={layout.cy} r={layout.rOut} fill="none" stroke={layout.lineColor} strokeWidth="1" />
        <circle cx={layout.cx} cy={layout.cy} r={layout.rSignIn} fill="none" stroke={layout.lineColor} strokeWidth="1" />
        <circle cx={layout.cx} cy={layout.cy} r={layout.rInner} fill={layout.innerFill} stroke={layout.lineColor} strokeWidth="1" />
        {layout.aspectLines.map((al, i) => {
          const dim = lineDimmed(al.from, al.to);
          return (
            <line
              key={`asp-${al.from}-${al.to}-${i}`}
              data-asp={`${al.from}-${al.to}`}
              x1={al.x0} y1={al.y0} x2={al.x1} y2={al.y1}
              stroke={color(al.strokeToken)}
              strokeWidth={dim ? 1 : 2}
              strokeOpacity={dim ? Math.min(0.1, al.alpha * 0.18) : al.alpha}
            />
          );
        })}
        {layout.signs.map((slice) => (
          <g key={slice.sign}>
            <path
              d={slice.pathD}
              fill={color(slice.fillToken)}
              fillOpacity={0.18}
            />
            <line x1={slice.x0} y1={slice.y0} x2={slice.xi0} y2={slice.yi0} stroke={layout.lineColor} strokeWidth="1" />
            <text x={slice.gx} y={slice.gy} fill={color("cream")} fontSize="13" textAnchor="middle" dominantBaseline="central">
              {slice.glyph}
            </text>
          </g>
        ))}
        {layout.hasHouses && layout.ascLabel ? (
          <>
            <text
              x={layout.ascLabel.x}
              y={layout.ascLabel.y}
              fill={color("gold")}
              fontSize="8"
              textAnchor={layout.ascLabel.anchor}
              dominantBaseline="central"
              fontWeight="700"
            >
              ASC
            </text>
            {layout.mcLabel ? (
              <text
                x={layout.mcLabel.x}
                y={layout.mcLabel.y}
                fill={color("gold")}
                fontSize="8"
                textAnchor={layout.mcLabel.anchor}
                dominantBaseline="central"
                fontWeight="700"
              >
                MC
              </text>
            ) : null}
          </>
        ) : null}
        {layout.houses.map((h) => (
          <g key={h.i}>
            <line x1={h.x0} y1={h.y0} x2={h.x1} y2={h.y1} stroke={layout.lineColor} strokeWidth="0.8" />
            <text x={h.hx} y={h.hy} fill={color("mist2")} fontSize="8" textAnchor="middle" dominantBaseline="central">
              {h.label}
            </text>
          </g>
        ))}
        {layout.planets.map(({ key, owner, body, px, py, strokeToken, gly }) => {
          const isFocus = interactive && focus?.owner === owner && focus.body === body;
          const dimPlanet = interactive && focus != null && !isFocus;
          return (
            <g
              key={key}
              data-planet={key}
              onPointerEnter={(e) => onPlanetPointerEnter(owner, body, e)}
              onPointerLeave={onPlanetPointerLeave}
              onPointerUp={(e) => onPlanetPointerUp(owner, body, e)}
              style={{ cursor: interactive ? "pointer" : undefined, opacity: dimPlanet ? 0.35 : 1 }}
            >
              {/* Keep a large invisible touch target on phone without crowding visuals. */}
              <circle cx={px} cy={py} r={layout.glyphR + 9} fill="transparent" />
              <circle
                cx={px} cy={py} r={layout.glyphR}
                fill={layout.planetFill}
                stroke={color(strokeToken)}
                strokeWidth={isFocus ? 1.75 : 1.25}
              />
              {/* Cream glyph fill: element-coloured air was unreadable at mobile width. */}
              <text x={px} y={py} fill={color("cream")} fontSize={layout.glyphFs} textAnchor="middle" dominantBaseline="central">
                {gly}
              </text>
            </g>
          );
        })}
      </svg>
      {layout.showYearNote ? (
        <p
          className="muted"
          style={{ fontSize: ".72rem", marginTop: 8, textAlign: "center", maxWidth: "36ch", marginLeft: "auto", marginRight: "auto", lineHeight: 1.45 }}
        >
          {YEAR_ASPECTS_NEED_DATE_NOTE}
        </p>
      ) : null}
      {layout.overlayMissingAspects ? (
        <p
          className="muted"
          data-overlay-aspects-missing=""
          style={{ fontSize: ".72rem", marginTop: 8, textAlign: "center", maxWidth: "36ch", marginLeft: "auto", marginRight: "auto", lineHeight: 1.45 }}
        >
          {OVERLAY_ASPECTS_MISSING_NOTE}
        </p>
      ) : null}
    </div>
  );
}
