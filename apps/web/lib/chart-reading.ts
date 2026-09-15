/**
 * Blog chart-reading: pick three placements from a computed natal chart and
 * read interpretPlacement() verbatim. ENGINEERING.md §12: never fabricate.
 *
 * Personalized path uses date-only precision, the same path as POST
 * /api/quick-chart when the visitor has a date and no birth time. Houses and
 * angles are not computed. Birthplace is collected so has_birth_data is
 * honest, but it is never silently geocoded (the Jacksonville bug) and it
 * does not change date-only planet signs.
 */

import {
  buildBirthInput,
  computeNatalChart,
  interpretPlacement,
  type Birth,
  type BodyKey,
  type NatalChart,
  type SignKey
} from "@galaxia/astro";
import { isMinorForSafety } from "@galaxia/core";
import { CHART_READING_NO_SETTLED_PLACEMENT } from "./chart-reading-copy";

/**
 * Cafe Astrology published Placidus chart used as external ground truth in
 * packages/astro/test/placidus-external-ground-truth.test.ts.
 *
 * Birth: 1987-12-29, 22:30 local time (CST, UTC-6), Little Rock, Arkansas.
 * lat 34.7465, lng -92.2896 → dateUTC 1987-12-30T04:30:00Z.
 *
 * This is the fallback when a capture has no birth data. It is a real
 * published chart, not a generic "if you are an Aries" stand-in.
 */
export const FALLBACK_PUBLISHED_BIRTH: Birth = {
  dateUTC: "1987-12-30T04:30:00.000Z",
  precision: "exact",
  lat: 34.7465,
  lng: -92.2896,
  tzOffsetMin: -360,
  houseSystem: "placidus"
};

export const CAPTURE_RATE_LIMIT = 3;
export const CAPTURE_WINDOW_MS = 24 * 60 * 60 * 1000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const OUTER_BODIES: ReadingBody[] = ["jupiter", "saturn", "uranus", "neptune", "pluto"];

export const BODY_LABEL: Record<"sun" | "moon" | "jupiter" | "saturn" | "uranus" | "neptune" | "pluto", string> = {
  sun: "Sun",
  moon: "Moon",
  jupiter: "Jupiter",
  saturn: "Saturn",
  uranus: "Uranus",
  neptune: "Neptune",
  pluto: "Pluto"
};

export type ReadingBody = keyof typeof BODY_LABEL;

export interface ChartReadingPlacement {
  body: ReadingBody;
  sign: SignKey;
  /** interpretPlacement(...).long, verbatim. */
  text: string;
}

export interface ChartReading {
  sample: boolean;
  personName: string | null;
  sunSign: SignKey | null;
  moonSign: SignKey | null;
  placements: ChartReadingPlacement[];
  /** Honest empty-state copy when birth data produced no settled placement. */
  emptyNote: string | null;
}

export function isValidCaptureEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}

export function normalizeCaptureEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hasCompleteBirthData(input: {
  month?: number;
  day?: number;
  year?: number;
  birthPlace?: string;
}): boolean {
  return Boolean(input.month && input.day && input.year && input.birthPlace?.trim());
}

function confidentPlacementText(
  chart: NatalChart,
  body: ReadingBody,
  minorSafe: boolean
): ChartReadingPlacement | null {
  const found = chart.placements.find((p) => p.body === body);
  if (!found || found.confident !== true) return null;
  const sign = found.sign as SignKey;
  const { long } = interpretPlacement(body as BodyKey, sign, { minorSafe });
  if (!long.trim()) return null;
  return { body, sign, text: long };
}

/**
 * Moon (if confident), then Sun (if confident), then the first confident
 * outer planet with a non-empty interpretPlacement long. Unconfident
 * placements are skipped. Never paraphrased.
 */
export function selectReadingPlacements(chart: NatalChart, minorSafe: boolean): ChartReadingPlacement[] {
  const selected: ChartReadingPlacement[] = [];
  const moon = confidentPlacementText(chart, "moon", minorSafe);
  if (moon) selected.push(moon);
  const sun = confidentPlacementText(chart, "sun", minorSafe);
  if (sun) selected.push(sun);
  for (const body of OUTER_BODIES) {
    const hit = confidentPlacementText(chart, body, minorSafe);
    if (hit) {
      selected.push(hit);
      break;
    }
  }
  return selected;
}

export function signOf(chart: NatalChart, body: ReadingBody): SignKey | null {
  const found = chart.placements.find((p) => p.body === body);
  if (!found || found.confident !== true) return null;
  return found.sign as SignKey;
}

export function buildPersonalizedChart(input: {
  month: number;
  day: number;
  year: number;
}): NatalChart {
  const built = buildBirthInput({
    precision: "date",
    month: input.month,
    day: input.day,
    year: input.year
  });
  return computeNatalChart(built.birth);
}

export function buildFallbackChart(): NatalChart {
  return computeNatalChart(FALLBACK_PUBLISHED_BIRTH);
}

export function buildChartReading(input: {
  name?: string;
  month?: number;
  day?: number;
  year?: number;
  birthPlace?: string;
}): ChartReading {
  const personName = input.name?.trim() ? input.name.trim() : null;
  const personalized = hasCompleteBirthData(input);

  if (personalized) {
    const chart = buildPersonalizedChart({
      month: input.month!,
      day: input.day!,
      year: input.year!
    });
    const birthDate = `${String(input.year).padStart(4, "0")}-${String(input.month).padStart(2, "0")}-${String(input.day).padStart(2, "0")}`;
    const minorSafe = isMinorForSafety({
      birthDate,
      birthPrecision: "date"
    });
    const placements = selectReadingPlacements(chart, minorSafe);
    return {
      sample: false,
      personName,
      sunSign: signOf(chart, "sun"),
      moonSign: signOf(chart, "moon"),
      placements,
      emptyNote: placements.length === 0 ? CHART_READING_NO_SETTLED_PLACEMENT : null
    };
  }

  const chart = buildFallbackChart();
  const placements = selectReadingPlacements(chart, false);
  return {
    sample: true,
    personName,
    sunSign: signOf(chart, "sun"),
    moonSign: signOf(chart, "moon"),
    placements,
    emptyNote: null
  };
}
