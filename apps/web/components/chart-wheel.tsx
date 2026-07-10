"use client";

/**
 * The natal chart wheel. Extracted from apps/web/app/app/person/[id]/page.tsx
 * so it can be reused by the public Quick Chart (/chart) without duplicating
 * the SVG geometry. Reference: design/reference/galaxia.jsx Wheel().
 */

import { computeSynastry, type NatalChart } from "@galaxia/astro";
import { BODY_GLYPH, SIGN_GLYPH, signElement } from "../lib/design";

const SIGNS_ORDER = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const EL_SOLID: Record<string, string> = { fire: "#E0825C", earth: "#cdbd7a", air: "#B79AD8", water: "#6FB1B8" };
const S = 300, CX = S / 2, CY = S / 2;
const R_OUT = 140, R_SIGN_IN = 112, R_SIGN_GL = 126, R_HOUSE_GL = 99, R_INNER = 62, R_PLANET = 84;
const LINE_COLOR = "rgba(230,174,108,.13)";

function pt(r: number, deg: number): [number, number] { const a = (deg * Math.PI) / 180; return [CX + r * Math.cos(a), CY - r * Math.sin(a)]; }
function svgAngle(lon: number, ascLon: number | null): number { const n = (v: number) => ((v % 360) + 360) % 360; return ascLon !== null ? n(180 - lon + ascLon) : n(270 - lon); }

export function ChartWheel({ chart }: { chart: NatalChart }) {
  const hasHouses = chart.cusps != null && chart.cusps.length >= 12;
  const ascLon: number | null = hasHouses ? (chart.cusps![0] ?? null) : null;
  // Never plot a planet whose sign is uncertain (year-only data): its drawn
  // position would be a guess presented as fact.
  const sortedPlanets = [...chart.placements].filter((p) => p.confident !== false).sort((a, b) => a.lon - b.lon);
  const planetPositions = sortedPlanets.map((p, idx) => {
    const a = svgAngle(p.lon, ascLon);
    const near = sortedPlanets.filter((q) => q.body !== p.body && Math.abs(q.lon - p.lon) < 14);
    const rr = near.length > 0 && idx % 2 === 1 ? R_PLANET - 15 : R_PLANET;
    const [px, py] = pt(rr, a);
    return { p, px, py, col: EL_SOLID[signElement(p.sign)] ?? "#b9aede", gly: BODY_GLYPH[p.body] ?? p.body[0].toUpperCase() };
  });
  const aspectLines = (chart.precision === "exact" || chart.precision === "date")
    ? computeSynastry(chart, chart).aspects
        .filter((a) => a.from !== a.to)
        .filter((a, idx, arr) => arr.findIndex((b) => [b.from, b.to].sort().join() === [a.from, a.to].sort().join() && b.type === a.type) === idx)
        .filter((a) => a.orb < 5).slice(0, 12)
        .map((a) => {
          const pa = chart.placements.find((p) => p.body === a.from), pb = chart.placements.find((p) => p.body === a.to);
          if (!pa || !pb) return null;
          const [x0, y0] = pt(R_INNER, svgAngle(pa.lon, ascLon));
          const [x1, y1] = pt(R_INNER, svgAngle(pb.lon, ascLon));
          const col = a.harmony >= 1.2 ? "rgba(111,177,184," : a.harmony < 0 ? "rgba(218,140,140," : "rgba(183,154,216,";
          return { x0, y0, x1, y1, col: col + Math.max(0.08, 0.22 - a.orb * 0.03) + ")" };
        }).filter(Boolean)
    : [];
  const houseCusps = hasHouses ? Array.from({ length: 12 }, (_, i) => { const lon = chart.cusps![i]!, a = svgAngle(lon, ascLon); const [x0, y0] = pt(R_SIGN_IN, a), [x1, y1] = pt(R_INNER, a), [hx, hy] = pt(R_HOUSE_GL, svgAngle(lon + 15, ascLon)); return { i, x0, y0, x1, y1, hx, hy }; }) : [];
  return (
    <div style={{ width: "100%", maxWidth: 290, margin: "0 auto" }}>
      <svg viewBox={`0 0 ${S} ${S}`} width="100%" style={{ display: "block" }}>
        <circle cx={CX} cy={CY} r={R_OUT} fill="none" stroke={LINE_COLOR} strokeWidth="1" />
        <circle cx={CX} cy={CY} r={R_SIGN_IN} fill="none" stroke={LINE_COLOR} strokeWidth="1" />
        <circle cx={CX} cy={CY} r={R_INNER} fill="rgba(10,7,23,.6)" stroke={LINE_COLOR} strokeWidth="1" />
        {aspectLines.map((al, i) => al ? <line key={i} x1={al.x0} y1={al.y0} x2={al.x1} y2={al.y1} stroke={al.col} strokeWidth="1" /> : null)}
        {SIGNS_ORDER.map((sign, i) => {
          const a0 = svgAngle(i * 30, ascLon), a1 = svgAngle(i * 30 + 30, ascLon);
          const [qx0, qy0] = pt(R_OUT, a0), [qx1, qy1] = pt(R_OUT, a1);
          const [qi1, qi1y] = pt(R_SIGN_IN, a1), [qi0, qi0y] = pt(R_SIGN_IN, a0);
          const [gx, gy] = pt(R_SIGN_GL, (a0 + a1) / 2);
          return (
            <g key={sign}>
              <path d={`M${qx0},${qy0} A${R_OUT},${R_OUT} 0 0 0 ${qx1},${qy1} L${qi1},${qi1y} A${R_SIGN_IN},${R_SIGN_IN} 0 0 1 ${qi0},${qi0y} Z`} fill={EL_SOLID[signElement(sign)] ?? "#b9aede"} opacity="0.18" />
              <line x1={qx0} y1={qy0} x2={qi0} y2={qi0y} stroke={LINE_COLOR} strokeWidth="1" />
              <text x={gx} y={gy} fill="#F4ECDB" fontSize="13" textAnchor="middle" dominantBaseline="central">{SIGN_GLYPH[sign]}</text>
            </g>
          );
        })}
        {hasHouses ? (
          <>
            <text x={pt(R_OUT + 10, 180)[0]} y={pt(R_OUT + 10, 180)[1]} fill="#E6AE6C" fontSize="8" textAnchor="middle" dominantBaseline="central" fontWeight="700">ASC</text>
            {chart.mc ? <text x={pt(R_OUT + 10, svgAngle(chart.cusps![9]!, ascLon))[0]} y={pt(R_OUT + 10, svgAngle(chart.cusps![9]!, ascLon))[1]} fill="#E6AE6C" fontSize="8" textAnchor="middle" dominantBaseline="central" fontWeight="700">MC</text> : null}
          </>
        ) : null}
        {houseCusps.map(({ i, x0, y0, x1, y1, hx, hy }) => (
          <g key={i}><line x1={x0} y1={y0} x2={x1} y2={y1} stroke={LINE_COLOR} strokeWidth="0.8" /><text x={hx} y={hy} fill="#8076a6" fontSize="8" textAnchor="middle" dominantBaseline="central">{i + 1}</text></g>
        ))}
        {planetPositions.map(({ p, px, py, col, gly }) => (
          <g key={p.body}><circle cx={px} cy={py} r="10" fill="rgba(10,7,23,.85)" stroke="rgba(230,174,108,.35)" strokeWidth="0.8" /><text x={px} y={py} fill={col} fontSize="11" textAnchor="middle" dominantBaseline="central">{gly}</text></g>
        ))}
      </svg>
    </div>
  );
}
