/**
 * Natal / synastry wheel geometry. Numbers copied from the web ChartWheel
 * (design/reference/galaxia.jsx Wheel). Renderers (DOM SVG, react-native-svg)
 * paint this layout; they do not recompute angles.
 *
 * Astro-free: callers pass already-shaped chart + aspect lists. The natal
 * `computeSynastry` fallback stays in the web ChartWheel so overlay Compare
 * never recomputes lines.
 */

import { ZODIAC_SIGNS } from "./person-chip-color";
import { BODY_GLYPH, SIGN_GLYPH, signElement } from "./glyphs";

export const SIGNS_ORDER = ZODIAC_SIGNS;

export const WHEEL_SIZE = 300;
export const WHEEL_CX = WHEEL_SIZE / 2;
export const WHEEL_CY = WHEEL_SIZE / 2;
export const WHEEL_R_OUT = 140;
export const WHEEL_R_SIGN_IN = 112;
export const WHEEL_R_SIGN_GL = 126;
export const WHEEL_R_HOUSE_GL = 99;
export const WHEEL_R_INNER = 62;
export const WHEEL_R_PLANET = 84;
/** Inner (A / house-frame) planet ring for synastry overlay mode. */
export const WHEEL_R_PLANET_A = 72;
/** Outer (B) planet ring for synastry overlay mode. */
export const WHEEL_R_PLANET_B = 96;
export const WHEEL_LINE_COLOR = "rgba(230,174,108,.13)";
export const WHEEL_INNER_FILL = "rgba(10,7,23,.6)";
export const WHEEL_PLANET_FILL = "rgba(10,7,23,.92)";
export const WHEEL_CLUSTER_PROXIMITY_DEG = 16;
export const WHEEL_CLUSTER_STEP_A = 12;
export const WHEEL_CLUSTER_STEP_B = 10;

export const COMPARE_WHEEL_NEEDS_HOUSES =
  "Add an exact birth time and city and the synastry wheel opens up.";

export const OVERLAY_ASPECTS_MISSING_NOTE =
  "Aspect lines need the compare aspects: none were passed to this wheel.";

export const YEAR_ASPECTS_NEED_DATE_NOTE =
  "Aspect lines need a birth date: a year alone can't place them honestly.";

export type WheelColorToken =
  | "fire"
  | "earth"
  | "air"
  | "water"
  | "teal"
  | "rose"
  | "mist"
  | "mist2"
  | "cream"
  | "gold";

export type WheelChartOwner = "a" | "b";

export type WheelAspect = {
  from: string;
  to: string;
  type: string;
  orb: number;
  harmony: number;
};

export type WheelPlacement = {
  body: string;
  lon: number;
  sign: string;
  confident?: boolean;
};

export type WheelChartLike = {
  placements: readonly WheelPlacement[];
  precision: "exact" | "date" | "year";
  cusps?: readonly number[] | null;
  mc?: string | null;
};

export type WheelAxisLabel = {
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
};

export type WheelSignSlice = {
  sign: string;
  pathD: string;
  fillToken: WheelColorToken;
  glyph: string;
  gx: number;
  gy: number;
  x0: number;
  y0: number;
  xi0: number;
  yi0: number;
};

export type WheelHouseCusp = {
  i: number;
  label: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  hx: number;
  hy: number;
};

export type WheelPlanetGlyph = {
  key: string;
  owner: WheelChartOwner;
  body: string;
  px: number;
  py: number;
  strokeToken: WheelColorToken;
  gly: string;
  overlay: boolean;
};

export type WheelAspectLine = {
  from: string;
  to: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  strokeToken: WheelColorToken;
  alpha: number;
};

export type ChartWheelLayout = {
  size: number;
  cx: number;
  cy: number;
  rOut: number;
  rSignIn: number;
  rInner: number;
  lineColor: string;
  innerFill: string;
  planetFill: string;
  isOverlay: boolean;
  hasHouses: boolean;
  overlayMissingAspects: boolean;
  showYearNote: boolean;
  glyphR: number;
  glyphFs: number;
  signs: WheelSignSlice[];
  houses: WheelHouseCusp[];
  planets: WheelPlanetGlyph[];
  aspectLines: WheelAspectLine[];
  ascLabel: WheelAxisLabel | null;
  mcLabel: WheelAxisLabel | null;
};

export type LayoutChartWheelInput = {
  chart: WheelChartLike;
  overlayChart?: WheelChartLike;
  aspects?: WheelAspect[] | null;
  /**
   * Raw natal self-aspects used only when `aspects` is omitted on a single
   * chart. Overlay never reads this. Web ChartWheel fills it from
   * `computeSynastry`; mobile always passes `aspects`.
   */
  natalFallbackAspects?: WheelAspect[];
};

export function wheelPoint(r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [WHEEL_CX + r * Math.cos(a), WHEEL_CY - r * Math.sin(a)];
}

export function svgAngle(lon: number, ascLon: number | null): number {
  const n = (v: number) => ((v % 360) + 360) % 360;
  return ascLon !== null ? n(180 - lon + ascLon) : n(270 - lon);
}

export function axisLabelPosition(angle: number): WheelAxisLabel {
  const [rawX, rawY] = wheelPoint(WHEEL_R_OUT + 10, angle);
  const edge = 8;
  if (rawX <= edge + 6) return { x: edge, y: rawY, anchor: "start" };
  if (rawX >= WHEEL_SIZE - edge - 6) return { x: WHEEL_SIZE - edge, y: rawY, anchor: "end" };
  return { x: rawX, y: rawY, anchor: "middle" };
}

export function clusterOffset(index: number, step: number): number {
  if (index === 0) return 0;
  const distance = Math.ceil(index / 2) * step;
  return index % 2 === 1 ? -distance : distance;
}

export function clusteredOffsets(
  sorted: readonly WheelPlacement[],
  proximityDeg: number,
  step: number,
): Map<string, number> {
  const offsets = new Map<string, number>();
  if (sorted.length === 0) return offsets;

  const clusters: WheelPlacement[][] = [];
  let current: WheelPlacement[] = [sorted[0]!];

  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1]!;
    const next = sorted[i]!;
    if (next.lon - prev.lon < proximityDeg) {
      current.push(next);
    } else {
      clusters.push(current);
      current = [next];
    }
  }
  clusters.push(current);

  if (clusters.length > 1) {
    const first = clusters[0]![0]!;
    const lastCluster = clusters[clusters.length - 1]!;
    const last = lastCluster[lastCluster.length - 1]!;
    const wrapGap = first.lon + 360 - last.lon;
    if (wrapGap < proximityDeg) {
      clusters[0] = [...lastCluster, ...clusters[0]!];
      clusters.pop();
    }
  }

  for (const cluster of clusters) {
    if (cluster.length === 1) {
      offsets.set(cluster[0]!.body, 0);
      continue;
    }
    cluster.forEach((planet, index) => {
      offsets.set(planet.body, clusterOffset(index, step));
    });
  }

  return offsets;
}

export function harmonyStrokeToken(harmony: number): WheelColorToken {
  if (harmony >= 1.2) return "teal";
  if (harmony < 0) return "rose";
  return "mist";
}

export function aspectAlpha(orb: number, harmony: number): number {
  const base = Math.max(0.55, 0.88 - orb * 0.04);
  if (harmony >= 0 && harmony < 1.2) return Math.min(0.92, base + 0.1);
  return base;
}

/**
 * Orient a compare pair so a person tagged `self` owns the inner house frame
 * as A, regardless of picker display order. Aspects are flipped when charts swap
 * so from→inner and to→overlay still hold.
 */
export function orientSynastryWheel<C, A extends WheelAspect>(
  personA: { relation?: string | null },
  personB: { relation?: string | null },
  chartA: C,
  chartB: C,
  aspects: A[],
): { chart: C; overlayChart: C; aspects: A[] } {
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

function planetRing(
  placements: readonly WheelPlacement[],
  ascLon: number | null,
  baseR: number,
  owner: WheelChartOwner,
): WheelPlanetGlyph[] {
  const sorted = [...placements].filter((p) => p.confident !== false).sort((a, b) => a.lon - b.lon);
  const offsets = clusteredOffsets(sorted, WHEEL_CLUSTER_PROXIMITY_DEG, owner === "b" ? WHEEL_CLUSTER_STEP_B : WHEEL_CLUSTER_STEP_A);
  return sorted.map((p) => {
    const a = svgAngle(p.lon, ascLon);
    const rr = baseR + (offsets.get(p.body) ?? 0);
    const [px, py] = wheelPoint(rr, a);
    const overlay = owner === "b";
    return {
      key: `${owner}-${p.body}`,
      owner,
      body: p.body,
      px,
      py,
      strokeToken: overlay ? "teal" : signElement(p.sign),
      gly: BODY_GLYPH[p.body] ?? p.body[0]!.toUpperCase(),
      overlay,
    };
  });
}

function historicalNatalAspects(list: readonly WheelAspect[]): WheelAspect[] {
  return list
    .filter((a) => a.from !== a.to)
    .filter(
      (a, idx, arr) =>
        arr.findIndex(
          (b) => [b.from, b.to].sort().join() === [a.from, a.to].sort().join() && b.type === a.type,
        ) === idx,
    )
    .filter((a) => a.orb < 5)
    .slice(0, 12);
}

function resolveAspectList(input: LayoutChartWheelInput): WheelAspect[] {
  const isOverlay = input.overlayChart != null;
  if (isOverlay) {
    if (input.aspects == null) return [];
    return input.aspects.filter((a) => a.from !== a.to).filter((a) => a.orb < 5).slice(0, 12);
  }
  const natalPrecisionOk = input.chart.precision === "exact" || input.chart.precision === "date";
  if (!natalPrecisionOk) return [];
  if (input.aspects != null) return input.aspects.filter((a) => a.from !== a.to);
  return historicalNatalAspects(input.natalFallbackAspects ?? []);
}

export function layoutChartWheel(input: LayoutChartWheelInput): ChartWheelLayout {
  const { chart, overlayChart } = input;
  const hasHouses = chart.cusps != null && chart.cusps.length >= 12;
  const ascLon: number | null = hasHouses ? (chart.cusps![0] ?? null) : null;
  const isOverlay = overlayChart != null;
  const overlayMissingAspects = isOverlay && input.aspects == null;
  const aspectList = resolveAspectList(input);

  const planets: WheelPlanetGlyph[] = isOverlay
    ? [
        ...planetRing(chart.placements, ascLon, WHEEL_R_PLANET_A, "a"),
        ...planetRing(overlayChart.placements, ascLon, WHEEL_R_PLANET_B, "b"),
      ]
    : planetRing(chart.placements, ascLon, WHEEL_R_PLANET, "a");

  const aspectLines: WheelAspectLine[] = isOverlay
    ? (aspectList
        .map((a) => {
          const pa = chart.placements.find((p) => p.body === a.from);
          const pb = overlayChart.placements.find((p) => p.body === a.to);
          if (!pa || !pb || pa.confident === false || pb.confident === false) return null;
          const [x0, y0] = wheelPoint(WHEEL_R_PLANET_A, svgAngle(pa.lon, ascLon));
          const [x1, y1] = wheelPoint(WHEEL_R_PLANET_B, svgAngle(pb.lon, ascLon));
          return {
            from: a.from,
            to: a.to,
            x0,
            y0,
            x1,
            y1,
            strokeToken: harmonyStrokeToken(a.harmony),
            alpha: aspectAlpha(a.orb, a.harmony),
          };
        })
        .filter(Boolean) as WheelAspectLine[])
    : (aspectList
        .map((a) => {
          const pa = chart.placements.find((p) => p.body === a.from);
          const pb = chart.placements.find((p) => p.body === a.to);
          if (!pa || !pb) return null;
          const [x0, y0] = wheelPoint(WHEEL_R_INNER, svgAngle(pa.lon, ascLon));
          const [x1, y1] = wheelPoint(WHEEL_R_INNER, svgAngle(pb.lon, ascLon));
          return {
            from: a.from,
            to: a.to,
            x0,
            y0,
            x1,
            y1,
            strokeToken: harmonyStrokeToken(a.harmony),
            alpha: aspectAlpha(a.orb, a.harmony),
          };
        })
        .filter(Boolean) as WheelAspectLine[]);

  const houses: WheelHouseCusp[] = hasHouses
    ? Array.from({ length: 12 }, (_, i) => {
        const lon = chart.cusps![i]!;
        const a = svgAngle(lon, ascLon);
        const [x0, y0] = wheelPoint(WHEEL_R_SIGN_IN, a);
        const [x1, y1] = wheelPoint(WHEEL_R_INNER, a);
        const [hx, hy] = wheelPoint(WHEEL_R_HOUSE_GL, svgAngle(lon + 15, ascLon));
        return { i, label: String(i + 1), x0, y0, x1, y1, hx, hy };
      })
    : [];

  const signs: WheelSignSlice[] = SIGNS_ORDER.map((sign, i) => {
    const a0 = svgAngle(i * 30, ascLon);
    const a1 = svgAngle(i * 30 + 30, ascLon);
    const [qx0, qy0] = wheelPoint(WHEEL_R_OUT, a0);
    const [qx1, qy1] = wheelPoint(WHEEL_R_OUT, a1);
    const [qi1, qi1y] = wheelPoint(WHEEL_R_SIGN_IN, a1);
    const [qi0, qi0y] = wheelPoint(WHEEL_R_SIGN_IN, a0);
    const [gx, gy] = wheelPoint(WHEEL_R_SIGN_GL, (a0 + a1) / 2);
    return {
      sign,
      pathD: `M${qx0},${qy0} A${WHEEL_R_OUT},${WHEEL_R_OUT} 0 0 0 ${qx1},${qy1} L${qi1},${qi1y} A${WHEEL_R_SIGN_IN},${WHEEL_R_SIGN_IN} 0 0 1 ${qi0},${qi0y} Z`,
      fillToken: signElement(sign),
      glyph: SIGN_GLYPH[sign] ?? sign[0]!,
      gx,
      gy,
      x0: qx0,
      y0: qy0,
      xi0: qi0,
      yi0: qi0y,
    };
  });

  const showYearNote = !isOverlay && chart.precision === "year" && aspectLines.length === 0;
  const ascLabel = hasHouses ? axisLabelPosition(180) : null;
  const mcLon = hasHouses && chart.mc ? chart.cusps![9] : undefined;
  const mcLabel = mcLon != null ? axisLabelPosition(svgAngle(mcLon, ascLon)) : null;

  return {
    size: WHEEL_SIZE,
    cx: WHEEL_CX,
    cy: WHEEL_CY,
    rOut: WHEEL_R_OUT,
    rSignIn: WHEEL_R_SIGN_IN,
    rInner: WHEEL_R_INNER,
    lineColor: WHEEL_LINE_COLOR,
    innerFill: WHEEL_INNER_FILL,
    planetFill: WHEEL_PLANET_FILL,
    isOverlay,
    hasHouses,
    overlayMissingAspects,
    showYearNote,
    glyphR: isOverlay ? 12 : 13,
    glyphFs: isOverlay ? 14 : 15,
    signs,
    houses,
    planets,
    aspectLines,
    ascLabel,
    mcLabel,
  };
}
