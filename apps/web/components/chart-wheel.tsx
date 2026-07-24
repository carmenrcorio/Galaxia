"use client";

/**
 * The natal chart wheel. Extracted from apps/web/app/app/person/[id]/page.tsx
 * so it can be reused by the public Quick Chart (/chart) without duplicating
 * the SVG geometry. Reference: design/reference/galaxia.jsx Wheel().
 *
 * Aspect web: when `aspects` is passed, those lines are drawn exactly (one list
 * with the person page Aspects tab). When absent, falls back to the historical
 * internal filter (self-synastry, orb < 5, max 12) so existing call sites stay
 * unchanged. With `outerChart` and no `aspects`, cross-chart synastry is used
 * so the biwheel seam is real for Compare without mounting Compare here.
 *
 * Colours: CSS custom properties from globals.css (`--fire` / `--earth` /
 * `--air` / `--water` / `--cream` / `--teal` / `--rose` / `--mist`). Verified
 * to survive the PDF print path — chart-pdf-export already paints glyphs with
 * `var(--${element})` in the same portal'd document, and print uses the live
 * DOM (not a var-stripping serializer). Planet glyph *text* uses `--cream` for
 * contrast on the dark disc; element colour stays on the planet ring stroke
 * (air at `--air` #B79AD8 is unreadable as glyph fill).
 */

import { computeSynastry, type Aspect, type BodyName, type NatalChart } from "@galaxia/astro";
import React, { useState, type PointerEvent as ReactPointerEvent } from "react";
import { BODY_GLYPH, SIGN_GLYPH, signElement } from "../lib/design";

const SIGNS_ORDER = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const S = 300, CX = S / 2, CY = S / 2;
const R_OUT = 140, R_SIGN_IN = 112, R_SIGN_GL = 126, R_HOUSE_GL = 99, R_INNER = 62, R_PLANET = 84;
/** Second ring for biwheel outer-chart planets — inside the sign ring, outside the inner planets. */
const R_PLANET_OUTER = 102;
const LINE_COLOR = "rgba(230,174,108,.13)";

type ChartOwner = "inner" | "outer";

export type ChartWheelProps = {
  chart: NatalChart;
  /** When set, drawn exactly — no internal recompute/filter. */
  aspects?: Aspect[];
  /** Biwheel seam: second person's placements on an outer ring. Houses stay on `chart`. */
  outerChart?: NatalChart;
  /**
   * Pointer highlight (tap/hover). PDF/print passes false so highlight degrades
   * to a static wheel — no handlers, no focus state.
   */
  interactive?: boolean;
};

function pt(r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)];
}

function svgAngle(lon: number, ascLon: number | null): number {
  const n = (v: number) => ((v % 360) + 360) % 360;
  return ascLon !== null ? n(180 - lon + ascLon) : n(270 - lon);
}

function elVar(sign: string): string {
  return `var(--${signElement(sign)})`;
}

/** Historical internal natal filter — kept for call sites that omit `aspects`. */
export function internalNatalAspects(chart: NatalChart): Aspect[] {
  if (chart.precision !== "exact" && chart.precision !== "date") return [];
  return computeSynastry(chart, chart).aspects
    .filter((a) => a.from !== a.to)
    .filter((a, idx, arr) => arr.findIndex((b) => [b.from, b.to].sort().join() === [a.from, a.to].sort().join() && b.type === a.type) === idx)
    .filter((a) => a.orb < 5)
    .slice(0, 12);
}

function internalBiwheelAspects(inner: NatalChart, outer: NatalChart): Aspect[] {
  if (inner.precision === "year" || outer.precision === "year") return [];
  return computeSynastry(inner, outer).aspects
    .filter((a) => a.from !== a.to)
    .filter((a, idx, arr) => arr.findIndex((b) => [b.from, b.to].sort().join() === [a.from, a.to].sort().join() && b.type === a.type) === idx)
    .filter((a) => a.orb < 5)
    .slice(0, 12);
}

function resolveAspects(chart: NatalChart, aspects: Aspect[] | undefined, outerChart: NatalChart | undefined): Aspect[] {
  if (aspects !== undefined) return aspects;
  if (outerChart) return internalBiwheelAspects(chart, outerChart);
  return internalNatalAspects(chart);
}

function harmonyStroke(harmony: number): string {
  if (harmony >= 1.2) return "var(--teal)";
  if (harmony < 0) return "var(--rose)";
  return "var(--mist)";
}

function aspectAlpha(orb: number): number {
  // Legible on the dark inner disc; tighter orbs read stronger.
  return Math.max(0.45, 0.78 - orb * 0.045);
}

type PlanetPlot = {
  key: string;
  owner: ChartOwner;
  body: BodyName;
  px: number;
  py: number;
  stroke: string;
  gly: string;
};

function plotPlanets(
  chart: NatalChart,
  owner: ChartOwner,
  baseR: number,
  ascLon: number | null
): PlanetPlot[] {
  const sorted = [...chart.placements].filter((p) => p.confident !== false).sort((a, b) => a.lon - b.lon);
  return sorted.map((p, idx) => {
    const a = svgAngle(p.lon, ascLon);
    const near = sorted.filter((q) => q.body !== p.body && Math.abs(q.lon - p.lon) < 14);
    const rr = near.length > 0 && idx % 2 === 1 ? baseR - 15 : baseR;
    const [px, py] = pt(rr, a);
    return {
      key: `${owner}-${p.body}`,
      owner,
      body: p.body,
      px,
      py,
      stroke: elVar(p.sign),
      gly: BODY_GLYPH[p.body] ?? p.body[0].toUpperCase(),
    };
  });
}

export function ChartWheel({ chart, aspects, outerChart, interactive = true }: ChartWheelProps) {
  const hasHouses = chart.cusps != null && chart.cusps.length >= 12;
  const ascLon: number | null = hasHouses ? (chart.cusps![0] ?? null) : null;
  const resolvedAspects = resolveAspects(chart, aspects, outerChart);

  const innerPlanets = plotPlanets(chart, "inner", R_PLANET, ascLon);
  const outerPlanets = outerChart ? plotPlanets(outerChart, "outer", R_PLANET_OUTER, ascLon) : [];
  const planetPositions = [...innerPlanets, ...outerPlanets];

  // Natal / passed self-aspects: both ends on `chart`. Biwheel synastry: from=inner, to=outer.
  const toChart = outerChart ?? chart;
  const aspectLines = resolvedAspects.map((a) => {
    const endA = chart.placements.find((p) => p.body === a.from);
    const endB = toChart.placements.find((p) => p.body === a.to);
    if (!endA || !endB) return null;
    const [x0, y0] = pt(R_INNER, svgAngle(endA.lon, ascLon));
    const [x1, y1] = pt(R_INNER, svgAngle(endB.lon, ascLon));
    return {
      from: a.from,
      to: a.to,
      x0, y0, x1, y1,
      stroke: harmonyStroke(a.harmony),
      alpha: aspectAlpha(a.orb),
    };
  }).filter(Boolean) as Array<{
    from: BodyName; to: BodyName;
    x0: number; y0: number; x1: number; y1: number;
    stroke: string; alpha: number;
  }>;

  const houseCusps = hasHouses
    ? Array.from({ length: 12 }, (_, i) => {
        const lon = chart.cusps![i]!;
        const a = svgAngle(lon, ascLon);
        const [x0, y0] = pt(R_SIGN_IN, a);
        const [x1, y1] = pt(R_INNER, a);
        const [hx, hy] = pt(R_HOUSE_GL, svgAngle(lon + 15, ascLon));
        return { i, x0, y0, x1, y1, hx, hy };
      })
    : [];

  const [focus, setFocus] = useState<{ owner: ChartOwner; body: BodyName } | null>(null);
  const showYearNote = chart.precision === "year" && aspectLines.length === 0;

  function lineDimmed(from: BodyName, to: BodyName): boolean {
    if (!interactive || !focus) return false;
    if (outerChart) {
      // Synastry shape: from = inner body, to = outer body.
      if (focus.owner === "inner") return focus.body !== from;
      return focus.body !== to;
    }
    return focus.body !== from && focus.body !== to;
  }

  function onPlanetPointerEnter(owner: ChartOwner, body: BodyName, e: ReactPointerEvent) {
    if (!interactive) return;
    if (e.pointerType === "touch") return;
    setFocus({ owner, body });
  }

  function onPlanetPointerLeave(e: ReactPointerEvent) {
    if (!interactive) return;
    if (e.pointerType === "touch") return;
    setFocus(null);
  }

  function onPlanetClick(owner: ChartOwner, body: BodyName) {
    if (!interactive) return;
    setFocus((prev) => (prev && prev.owner === owner && prev.body === body ? null : { owner, body }));
  }

  return (
    <div style={{ width: "100%", maxWidth: 290, margin: "0 auto" }}>
      <svg viewBox={`0 0 ${S} ${S}`} width="100%" style={{ display: "block" }}>
        <circle cx={CX} cy={CY} r={R_OUT} fill="none" stroke={LINE_COLOR} strokeWidth="1" />
        <circle cx={CX} cy={CY} r={R_SIGN_IN} fill="none" stroke={LINE_COLOR} strokeWidth="1" />
        <circle cx={CX} cy={CY} r={R_INNER} fill="rgba(10,7,23,.6)" stroke={LINE_COLOR} strokeWidth="1" />
        {aspectLines.map((al, i) => {
          const dim = lineDimmed(al.from, al.to);
          return (
            <line
              key={`asp-${al.from}-${al.to}-${i}`}
              data-asp={`${al.from}-${al.to}`}
              x1={al.x0} y1={al.y0} x2={al.x1} y2={al.y1}
              stroke={al.stroke}
              strokeWidth={dim ? 1 : 1.75}
              strokeOpacity={dim ? Math.min(0.12, al.alpha * 0.22) : al.alpha}
            />
          );
        })}
        {SIGNS_ORDER.map((sign, i) => {
          const a0 = svgAngle(i * 30, ascLon), a1 = svgAngle(i * 30 + 30, ascLon);
          const [qx0, qy0] = pt(R_OUT, a0), [qx1, qy1] = pt(R_OUT, a1);
          const [qi1, qi1y] = pt(R_SIGN_IN, a1), [qi0, qi0y] = pt(R_SIGN_IN, a0);
          const [gx, gy] = pt(R_SIGN_GL, (a0 + a1) / 2);
          return (
            <g key={sign}>
              <path
                d={`M${qx0},${qy0} A${R_OUT},${R_OUT} 0 0 0 ${qx1},${qy1} L${qi1},${qi1y} A${R_SIGN_IN},${R_SIGN_IN} 0 0 1 ${qi0},${qi0y} Z`}
                fill={elVar(sign)}
                fillOpacity={0.18}
              />
              <line x1={qx0} y1={qy0} x2={qi0} y2={qi0y} stroke={LINE_COLOR} strokeWidth="1" />
              <text x={gx} y={gy} fill="var(--cream)" fontSize="13" textAnchor="middle" dominantBaseline="central">{SIGN_GLYPH[sign]}</text>
            </g>
          );
        })}
        {hasHouses ? (
          <>
            <text x={pt(R_OUT + 10, 180)[0]} y={pt(R_OUT + 10, 180)[1]} fill="var(--gold)" fontSize="8" textAnchor="middle" dominantBaseline="central" fontWeight="700">ASC</text>
            {chart.mc ? <text x={pt(R_OUT + 10, svgAngle(chart.cusps![9]!, ascLon))[0]} y={pt(R_OUT + 10, svgAngle(chart.cusps![9]!, ascLon))[1]} fill="var(--gold)" fontSize="8" textAnchor="middle" dominantBaseline="central" fontWeight="700">MC</text> : null}
          </>
        ) : null}
        {houseCusps.map(({ i, x0, y0, x1, y1, hx, hy }) => (
          <g key={i}>
            <line x1={x0} y1={y0} x2={x1} y2={y1} stroke={LINE_COLOR} strokeWidth="0.8" />
            <text x={hx} y={hy} fill="var(--mist2)" fontSize="8" textAnchor="middle" dominantBaseline="central">{i + 1}</text>
          </g>
        ))}
        {planetPositions.map(({ key, owner, body, px, py, stroke, gly }) => {
          const isFocus = interactive && focus?.owner === owner && focus.body === body;
          const dimPlanet = interactive && focus != null && !isFocus;
          return (
            <g
              key={key}
              data-planet={key}
              onPointerEnter={(e) => onPlanetPointerEnter(owner, body, e)}
              onPointerLeave={onPlanetPointerLeave}
              onClick={() => onPlanetClick(owner, body)}
              style={{ cursor: interactive ? "pointer" : undefined, opacity: dimPlanet ? 0.35 : 1 }}
            >
              <circle
                cx={px} cy={py} r="12"
                fill="rgba(10,7,23,.9)"
                stroke={stroke}
                strokeWidth={isFocus ? 1.6 : 1.15}
              />
              {/* Cream glyph fill: element-coloured air (#B79AD8) was unreadable at mobile width. */}
              <text x={px} y={py} fill="var(--cream)" fontSize="14" textAnchor="middle" dominantBaseline="central">{gly}</text>
            </g>
          );
        })}
      </svg>
      {showYearNote ? (
        // FOUNDER-REVIEW — honest empty-center copy when year-only data cannot place aspects.
        <p
          className="muted"
          style={{ fontSize: ".72rem", marginTop: 8, textAlign: "center", maxWidth: "36ch", marginLeft: "auto", marginRight: "auto", lineHeight: 1.45 }}
        >
          Aspect lines need a birth date — a year alone can&apos;t place them honestly.
        </p>
      ) : null}
    </div>
  );
}
