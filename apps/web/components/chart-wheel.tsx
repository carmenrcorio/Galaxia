"use client";

/**
 * The natal chart wheel. Extracted from apps/web/app/app/person/[id]/page.tsx
 * so it can be reused by the public Quick Chart (/chart) without duplicating
 * the SVG geometry. Reference: design/reference/galaxia.jsx Wheel().
 *
 * Optional `overlayChart` draws a synastry bi-wheel: `chart` is the inner ring
 * and owns the house frame; overlay planets sit on the outer ring. When
 * `aspects` are passed (Compare), those lines are used — never recomputed.
 * Single-chart call sites stay one-arg and keep the internal natal fallback.
 */

import { computeSynastry, type NatalChart } from "@galaxia/astro";
import { BODY_GLYPH, SIGN_GLYPH, signElement } from "../lib/design";

const SIGNS_ORDER = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const EL_SOLID: Record<string, string> = { fire: "#E0825C", earth: "#cdbd7a", air: "#B79AD8", water: "#6FB1B8" };
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
   * natal self-aspects when omitted.
   */
  aspects?: WheelAspect[];
};

type PlanetGlyph = {
  key: string;
  px: number;
  py: number;
  col: string;
  gly: string;
  /** Outer-ring (B) glyphs use a teal stroke so the two charts stay distinct. */
  overlay: boolean;
};

function pt(r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)];
}

function svgAngle(lon: number, ascLon: number | null): number {
  const n = (v: number) => ((v % 360) + 360) % 360;
  return ascLon !== null ? n(180 - lon + ascLon) : n(270 - lon);
}

function planetRing(
  placements: NatalChart["placements"],
  ascLon: number | null,
  baseR: number,
  owner: "a" | "b",
): PlanetGlyph[] {
  const sorted = [...placements].filter((p) => p.confident !== false).sort((a, b) => a.lon - b.lon);
  return sorted.map((p, idx) => {
    const a = svgAngle(p.lon, ascLon);
    const near = sorted.filter((q) => q.body !== p.body && Math.abs(q.lon - p.lon) < 14);
    const rr = near.length > 0 && idx % 2 === 1 ? baseR - 15 : baseR;
    const [px, py] = pt(rr, a);
    return {
      key: `${owner}-${p.body}`,
      px,
      py,
      col: EL_SOLID[signElement(p.sign)] ?? "#b9aede",
      gly: BODY_GLYPH[p.body] ?? p.body[0].toUpperCase(),
      overlay: owner === "b",
    };
  });
}

function aspectStroke(harmony: number, orb: number): string {
  // Existing natal opacity: max(0.08, 0.22 - orb*0.03) → 8%–22%.
  // Contrast is low enough that the center can look empty; left unchanged here
  // so natal one-arg behavior stays identical (separate contrast branch).
  const col = harmony >= 1.2 ? "rgba(111,177,184," : harmony < 0 ? "rgba(218,140,140," : "rgba(183,154,216,";
  return col + Math.max(0.08, 0.22 - orb * 0.03) + ")";
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

export function ChartWheel({ chart, overlayChart, aspects: aspectsProp }: ChartWheelProps) {
  const hasHouses = chart.cusps != null && chart.cusps.length >= 12;
  const ascLon: number | null = hasHouses ? (chart.cusps![0] ?? null) : null;
  const isOverlay = overlayChart != null;

  const planetPositions: PlanetGlyph[] = isOverlay
    ? [
        ...planetRing(chart.placements, ascLon, R_PLANET_A, "a"),
        ...planetRing(overlayChart.placements, ascLon, R_PLANET_B, "b"),
      ]
    : planetRing(chart.placements, ascLon, R_PLANET, "a");

  const natalPrecisionOk = chart.precision === "exact" || chart.precision === "date";
  const aspectLines = (() => {
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
          return { x0, y0, x1, y1, col: aspectStroke(a.harmony, a.orb) };
        })
        .filter(Boolean);
    }
    if (!natalPrecisionOk) return [];
    const source = aspectsProp ?? computeSynastry(chart, chart).aspects;
    return source
      .filter((a) => a.from !== a.to)
      .filter((a, idx, arr) => arr.findIndex((b) => [b.from, b.to].sort().join() === [a.from, a.to].sort().join() && b.type === a.type) === idx)
      .filter((a) => a.orb < 5)
      .slice(0, 12)
      .map((a) => {
        const pa = chart.placements.find((p) => p.body === a.from);
        const pb = chart.placements.find((p) => p.body === a.to);
        if (!pa || !pb) return null;
        const [x0, y0] = pt(R_INNER, svgAngle(pa.lon, ascLon));
        const [x1, y1] = pt(R_INNER, svgAngle(pb.lon, ascLon));
        return { x0, y0, x1, y1, col: aspectStroke(a.harmony, a.orb) };
      })
      .filter(Boolean);
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

  return (
    <div style={{ width: "100%", maxWidth: 290, margin: "0 auto" }}>
      <svg viewBox={`0 0 ${S} ${S}`} width="100%" style={{ display: "block" }}>
        <circle cx={CX} cy={CY} r={R_OUT} fill="none" stroke={LINE_COLOR} strokeWidth="1" />
        <circle cx={CX} cy={CY} r={R_SIGN_IN} fill="none" stroke={LINE_COLOR} strokeWidth="1" />
        <circle cx={CX} cy={CY} r={R_INNER} fill="rgba(10,7,23,.6)" stroke={LINE_COLOR} strokeWidth="1" />
        {aspectLines.map((al, i) =>
          al ? <line key={i} x1={al.x0} y1={al.y0} x2={al.x1} y2={al.y1} stroke={al.col} strokeWidth="1" /> : null
        )}
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
                fill={EL_SOLID[signElement(sign)] ?? "#b9aede"}
                opacity="0.18"
              />
              <line x1={qx0} y1={qy0} x2={qi0} y2={qi0y} stroke={LINE_COLOR} strokeWidth="1" />
              <text x={gx} y={gy} fill="#F4ECDB" fontSize="13" textAnchor="middle" dominantBaseline="central">
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
              fill="#E6AE6C"
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
                fill="#E6AE6C"
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
            <text x={hx} y={hy} fill="#8076a6" fontSize="8" textAnchor="middle" dominantBaseline="central">
              {i + 1}
            </text>
          </g>
        ))}
        {planetPositions.map((pos) => (
          <g key={pos.key}>
            <circle
              cx={pos.px}
              cy={pos.py}
              r="10"
              fill="rgba(10,7,23,.85)"
              stroke={pos.overlay ? "rgba(111,177,184,.45)" : "rgba(230,174,108,.35)"}
              strokeWidth="0.8"
            />
            <text x={pos.px} y={pos.py} fill={pos.col} fontSize="11" textAnchor="middle" dominantBaseline="central">
              {pos.gly}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
