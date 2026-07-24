"use client";

/**
 * The natal chart wheel. Extracted from apps/web/app/app/person/[id]/page.tsx
 * so it can be reused by the public Quick Chart (/chart) without duplicating
 * the SVG geometry. Reference: design/reference/galaxia.jsx Wheel().
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
import React, { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { BODY_GLYPH, SIGN_GLYPH, signElement } from "../lib/design";

const SIGNS_ORDER = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const S = 300, CX = S / 2, CY = S / 2;
const R_OUT = 140, R_SIGN_IN = 112, R_SIGN_GL = 126, R_HOUSE_GL = 99, R_INNER = 62, R_PLANET = 84;
/** Inner (A / house-frame) planet ring for synastry overlay mode. */
const R_PLANET_A = 72;
/** Outer (B) planet ring for synastry overlay mode. */
const R_PLANET_B = 96;
const LINE_COLOR = "rgba(230,174,108,.13)";

// FOUNDER-REVIEW: authored — compare bi-wheel missing-houses hedge (all Compare surfaces).
export const COMPARE_WHEEL_NEEDS_HOUSES =
  "Add an exact birth time and city for the house-frame person to unlock the synastry wheel.";

// FOUNDER-REVIEW — overlay mounted without aspects (call-site bug, not year precision).
export const OVERLAY_ASPECTS_MISSING_NOTE =
  "Aspect lines need the compare aspects — none were passed to this wheel.";

export type WheelAspect = {
  from: string;
  to: string;
  type: string;
  orb: number;
  harmony: number;
};

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
};

type ChartOwner = "a" | "b";

type PlanetGlyph = {
  key: string;
  owner: ChartOwner;
  body: string;
  px: number;
  py: number;
  stroke: string;
  gly: string;
  /** Outer-ring (B) glyphs use a teal stroke so the two charts stay distinct. */
  overlay: boolean;
};

type AspectLine = {
  from: string;
  to: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  stroke: string;
  alpha: number;
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

function harmonyStroke(harmony: number): string {
  if (harmony >= 1.2) return "var(--teal)";
  if (harmony < 0) return "var(--rose)";
  return "var(--mist)";
}

function aspectAlpha(orb: number, harmony: number): number {
  // Retuned for main's 72/96 geometry on the dark disc.
  const base = Math.max(0.55, 0.88 - orb * 0.04);
  if (harmony >= 0 && harmony < 1.2) return Math.min(0.92, base + 0.1);
  return base;
}

function planetRing(
  placements: NatalChart["placements"],
  ascLon: number | null,
  baseR: number,
  owner: ChartOwner,
): PlanetGlyph[] {
  const sorted = [...placements].filter((p) => p.confident !== false).sort((a, b) => a.lon - b.lon);
  return sorted.map((p, idx) => {
    const a = svgAngle(p.lon, ascLon);
    const near = sorted.filter((q) => q.body !== p.body && Math.abs(q.lon - p.lon) < 14);
    const rr = near.length > 0 && idx % 2 === 1 ? baseR - 15 : baseR;
    const [px, py] = pt(rr, a);
    const overlay = owner === "b";
    return {
      key: `${owner}-${p.body}`,
      owner,
      body: p.body,
      px,
      py,
      // B ring: teal so overlay stays distinct from A/natal element strokes.
      stroke: overlay ? "var(--teal)" : elVar(p.sign),
      gly: BODY_GLYPH[p.body] ?? p.body[0].toUpperCase(),
      overlay,
    };
  });
}

/**
 * Orient a compare pair so a person tagged `self` owns the inner house frame
 * as A, regardless of picker display order. Aspects are flipped when charts swap
 * so from→inner and to→overlay still hold.
 */
export function orientSynastryWheel(
  personA: { relation?: string | null },
  personB: { relation?: string | null },
  chartA: NatalChart,
  chartB: NatalChart,
  aspects: WheelAspect[],
): { chart: NatalChart; overlayChart: NatalChart; aspects: WheelAspect[] } {
  const bIsSelf = personB.relation === "self";
  const aIsSelf = personA.relation === "self";
  if (bIsSelf && !aIsSelf) {
    return {
      chart: chartB,
      overlayChart: chartA,
      aspects: aspects.map((a) => ({ ...a, from: a.to, to: a.from })),
    };
  }
  return { chart: chartA, overlayChart: chartB, aspects };
}

export function ChartWheel({ chart, overlayChart, aspects: aspectsProp, interactive = true }: ChartWheelProps) {
  const hasHouses = chart.cusps != null && chart.cusps.length >= 12;
  const ascLon: number | null = hasHouses ? (chart.cusps![0] ?? null) : null;
  const isOverlay = overlayChart != null;
  const overlayMissingAspects = isOverlay && aspectsProp == null;
  const overlayWarnOnce = useRef(false);
  if (overlayMissingAspects && !overlayWarnOnce.current) {
    overlayWarnOnce.current = true;
    console.warn(
      "[ChartWheel] overlayChart was mounted without aspects — synastry lines will not draw. Pass the already-computed Compare aspects."
    );
  }

  const planetPositions: PlanetGlyph[] = isOverlay
    ? [
        ...planetRing(chart.placements, ascLon, R_PLANET_A, "a"),
        ...planetRing(overlayChart.placements, ascLon, R_PLANET_B, "b"),
      ]
    : planetRing(chart.placements, ascLon, R_PLANET, "a");

  const natalPrecisionOk = chart.precision === "exact" || chart.precision === "date";
  const aspectLines: AspectLine[] = (() => {
    if (isOverlay) {
      // Overlay: only draw when Compare passes already-computed aspects.
      if (!aspectsProp) return [];
      return aspectsProp
        .filter((a) => a.from !== a.to)
        .filter((a) => a.orb < 5)
        .slice(0, 12)
        .map((a) => {
          const pa = chart.placements.find((p) => p.body === a.from);
          const pb = overlayChart.placements.find((p) => p.body === a.to);
          if (!pa || !pb || pa.confident === false || pb.confident === false) return null;
          const [x0, y0] = pt(R_PLANET_A, svgAngle(pa.lon, ascLon));
          const [x1, y1] = pt(R_PLANET_B, svgAngle(pb.lon, ascLon));
          return {
            from: a.from,
            to: a.to,
            x0, y0, x1, y1,
            stroke: harmonyStroke(a.harmony),
            alpha: aspectAlpha(a.orb, a.harmony),
          };
        })
        .filter(Boolean) as AspectLine[];
    }
    if (!natalPrecisionOk) return [];
    // Person page passes aspects — draw exactly that list. Otherwise historical filter.
    const list: WheelAspect[] = aspectsProp
      ? aspectsProp.filter((a) => a.from !== a.to)
      : computeSynastry(chart, chart).aspects
        .filter((a) => a.from !== a.to)
        .filter((a, idx, arr) => arr.findIndex((b) => [b.from, b.to].sort().join() === [a.from, a.to].sort().join() && b.type === a.type) === idx)
        .filter((a) => a.orb < 5)
        .slice(0, 12);
    return list
      .map((a) => {
        const pa = chart.placements.find((p) => p.body === a.from);
        const pb = chart.placements.find((p) => p.body === a.to);
        if (!pa || !pb) return null;
        const [x0, y0] = pt(R_INNER, svgAngle(pa.lon, ascLon));
        const [x1, y1] = pt(R_INNER, svgAngle(pb.lon, ascLon));
        return {
          from: a.from,
          to: a.to,
          x0, y0, x1, y1,
          stroke: harmonyStroke(a.harmony),
          alpha: aspectAlpha(a.orb, a.harmony),
        };
      })
      .filter(Boolean) as AspectLine[];
  })();

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

  const [focus, setFocus] = useState<{ owner: ChartOwner; body: string } | null>(null);
  const showYearNote = !isOverlay && chart.precision === "year" && aspectLines.length === 0;

  function lineDimmed(from: string, to: string): boolean {
    if (!interactive || !focus) return false;
    if (isOverlay) {
      // Synastry shape: from = A (inner), to = B (outer).
      if (focus.owner === "a") return focus.body !== from;
      return focus.body !== to;
    }
    return focus.body !== from && focus.body !== to;
  }

  function onPlanetPointerEnter(owner: ChartOwner, body: string, e: ReactPointerEvent) {
    if (!interactive) return;
    if (e.pointerType === "touch") return;
    setFocus({ owner, body });
  }

  function onPlanetPointerLeave(e: ReactPointerEvent) {
    if (!interactive) return;
    if (e.pointerType === "touch") return;
    setFocus(null);
  }

  function onPlanetPointerUp(owner: ChartOwner, body: string, e: ReactPointerEvent) {
    if (!interactive) return;
    if (e.pointerType !== "touch") return;
    setFocus((prev) => (prev && prev.owner === owner && prev.body === body ? null : { owner, body }));
  }

  // Glyph size retuned for main's 72/96 rings (closer to each other and the sign band).
  const glyphR = isOverlay ? 11 : 12;
  const glyphFs = isOverlay ? 13 : 14;

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
              strokeWidth={dim ? 1 : 2}
              strokeOpacity={dim ? Math.min(0.1, al.alpha * 0.18) : al.alpha}
            />
          );
        })}
        {SIGNS_ORDER.map((sign, i) => {
          const a0 = svgAngle(i * 30, ascLon);
          const a1 = svgAngle(i * 30 + 30, ascLon);
          const [qx0, qy0] = pt(R_OUT, a0);
          const [qx1, qy1] = pt(R_OUT, a1);
          const [qi1, qi1y] = pt(R_SIGN_IN, a1);
          const [qi0, qi0y] = pt(R_SIGN_IN, a0);
          const [gx, gy] = pt(R_SIGN_GL, (a0 + a1) / 2);
          return (
            <g key={sign}>
              <path
                d={`M${qx0},${qy0} A${R_OUT},${R_OUT} 0 0 0 ${qx1},${qy1} L${qi1},${qi1y} A${R_SIGN_IN},${R_SIGN_IN} 0 0 1 ${qi0},${qi0y} Z`}
                fill={elVar(sign)}
                fillOpacity={0.18}
              />
              <line x1={qx0} y1={qy0} x2={qi0} y2={qi0y} stroke={LINE_COLOR} strokeWidth="1" />
              <text x={gx} y={gy} fill="var(--cream)" fontSize="13" textAnchor="middle" dominantBaseline="central">
                {SIGN_GLYPH[sign]}
              </text>
            </g>
          );
        })}
        {hasHouses ? (
          <>
            <text
              x={pt(R_OUT + 10, 180)[0]}
              y={pt(R_OUT + 10, 180)[1]}
              fill="var(--gold)"
              fontSize="8"
              textAnchor="middle"
              dominantBaseline="central"
              fontWeight="700"
            >
              ASC
            </text>
            {chart.mc ? (
              <text
                x={pt(R_OUT + 10, svgAngle(chart.cusps![9]!, ascLon))[0]}
                y={pt(R_OUT + 10, svgAngle(chart.cusps![9]!, ascLon))[1]}
                fill="var(--gold)"
                fontSize="8"
                textAnchor="middle"
                dominantBaseline="central"
                fontWeight="700"
              >
                MC
              </text>
            ) : null}
          </>
        ) : null}
        {houseCusps.map(({ i, x0, y0, x1, y1, hx, hy }) => (
          <g key={i}>
            <line x1={x0} y1={y0} x2={x1} y2={y1} stroke={LINE_COLOR} strokeWidth="0.8" />
            <text x={hx} y={hy} fill="var(--mist2)" fontSize="8" textAnchor="middle" dominantBaseline="central">
              {i + 1}
            </text>
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
              onPointerUp={(e) => onPlanetPointerUp(owner, body, e)}
              style={{ cursor: interactive ? "pointer" : undefined, opacity: dimPlanet ? 0.35 : 1 }}
            >
              <circle
                cx={px} cy={py} r={glyphR}
                fill="rgba(10,7,23,.92)"
                stroke={stroke}
                strokeWidth={isFocus ? 1.75 : 1.25}
              />
              {/* Cream glyph fill: element-coloured air was unreadable at mobile width. */}
              <text x={px} y={py} fill="var(--cream)" fontSize={glyphFs} textAnchor="middle" dominantBaseline="central">
                {gly}
              </text>
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
      {overlayMissingAspects ? (
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
