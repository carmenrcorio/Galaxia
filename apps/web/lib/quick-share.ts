/**
 * Token-based Quick Chart / Quick Compare share snapshots.
 *
 * Persist stores the already-computed reading (placements, orbs, scores,
 * display labels). It never stores exact birth time, lat/lng, or tzOffsetMin.
 * Compare snapshots that pair a minor with romantic framing are refused at
 * persist time — that is the structural guarantee; /s only renders stored data.
 */

import {
  isRomanticRelation,
  type NatalChart,
  type RelationType,
} from "@galaxia/astro";

// Client-safe module: types, validation, framing, copy.
// DB + node:crypto live in lib/quick-share-server.ts (server-only).

export type QuickShareKind = "single" | "compare";

export type SynastryShareShape = {
  scores: Record<string, number>;
  aspects: Array<{ from: string; to: string; type: string; orb: number; harmony: number }>;
};

export type GenerationalShareShape = {
  theme: string;
  shared: { planet: string; sign: string }[];
  diverged: { planet: string; signA: string; signB: string }[];
};

/** Fields the single-chart reading visibly displays + computed engine output. */
export type SingleSharePayload = {
  name?: string;
  displayDate: string;
  birthPlace: string | null;
  chart: NatalChart;
};

/**
 * Post-block safe compare reading. `pairHasMinor` is stored so /s can keep
 * platonic/held framing without recomputing age from birth dates.
 */
export type CompareSharePayload = {
  nameA?: string;
  nameB?: string;
  relationType: "romantic" | "platonic";
  pairHasMinor: boolean;
  romanticHeldNotice?: boolean;
  chartA: NatalChart;
  chartB: NatalChart;
  synastry: SynastryShareShape | null;
  generational: GenerationalShareShape;
};

export type QuickSharePayload = SingleSharePayload | CompareSharePayload;

export type QuickShareRow = {
  share_token: string;
  kind: QuickShareKind;
  payload: QuickSharePayload;
  created_at: string;
};

// FOUNDER-REVIEW: authored — Quick Compare held-reading (shared with /s).
export const QUICK_COMPARE_HELD_READING =
  "A minor is part of this comparison, so Galaxia won't produce a romantic reading here. Only a platonic reading is available for this pairing.";

// FOUNDER-REVIEW: authored — minor notice under the focus pills (shared with /s).
export const QUICK_COMPARE_MINOR_NOTICE =
  "A minor is part of this comparison, so only a platonic reading is available. Romantic framing is turned off for pairings involving a child.";

/** Keys that must never appear in a stored or returned snapshot payload. */
const FORBIDDEN_PII_KEYS = new Set([
  "birthDate",
  "birthPrecision",
  "birth_date",
  "birth_precision",
  "lat",
  "lng",
  "tzOffsetMin",
  "tzId",
  "tz",
  "dateUTC",
  "hour",
  "minute",
  "month",
  "day",
  "year",
  "yearOnly",
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Deep-strip forbidden birth-PII keys from any JSON-like value. */
export function stripBirthPii<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripBirthPii(item)) as T;
  }
  if (!isPlainObject(value)) return value;
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_PII_KEYS.has(key)) continue;
    out[key] = stripBirthPii(child);
  }
  return out as T;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function sanitizeChart(raw: unknown): NatalChart | null {
  if (!isPlainObject(raw)) return null;
  if (!Array.isArray(raw.placements)) return null;
  const precision = raw.precision;
  if (precision !== "exact" && precision !== "date" && precision !== "year") return null;
  // Rebuild from known NatalChart fields only — never pass through lat/lng/dateUTC.
  const chart: NatalChart = {
    placements: stripBirthPii(raw.placements) as NatalChart["placements"],
    precision,
    generational: stripBirthPii(raw.generational) as NatalChart["generational"],
  };
  if (typeof raw.asc === "string") chart.asc = raw.asc as NatalChart["asc"];
  if (typeof raw.mc === "string") chart.mc = raw.mc as NatalChart["mc"];
  if (Array.isArray(raw.cusps)) chart.cusps = raw.cusps as number[];
  if (typeof raw.houseSystem === "string") chart.houseSystem = raw.houseSystem as NatalChart["houseSystem"];
  if (typeof raw.houseSystemRequested === "string") {
    chart.houseSystemRequested = raw.houseSystemRequested as NatalChart["houseSystemRequested"];
  }
  if (typeof raw.houseSystemFallbackReason === "string") {
    chart.houseSystemFallbackReason = raw.houseSystemFallbackReason;
  }
  return chart;
}

function sanitizeSynastry(raw: unknown): SynastryShareShape | null {
  if (raw === null) return null;
  if (!isPlainObject(raw) || !isPlainObject(raw.scores) || !Array.isArray(raw.aspects)) return null;
  const scores: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw.scores)) {
    if (typeof v === "number" && Number.isFinite(v)) scores[k] = v;
  }
  const aspects: SynastryShareShape["aspects"] = [];
  for (const item of raw.aspects) {
    if (!isPlainObject(item)) continue;
    if (typeof item.from !== "string" || typeof item.to !== "string" || typeof item.type !== "string") continue;
    if (typeof item.orb !== "number" || typeof item.harmony !== "number") continue;
    aspects.push({
      from: item.from,
      to: item.to,
      type: item.type,
      orb: item.orb,
      harmony: item.harmony,
    });
  }
  return { scores, aspects };
}

function sanitizeGenerational(raw: unknown): GenerationalShareShape | null {
  if (!isPlainObject(raw) || typeof raw.theme !== "string") return null;
  const shared = Array.isArray(raw.shared) ? (stripBirthPii(raw.shared) as GenerationalShareShape["shared"]) : [];
  const diverged = Array.isArray(raw.diverged)
    ? (stripBirthPii(raw.diverged) as GenerationalShareShape["diverged"])
    : [];
  return { theme: raw.theme, shared, diverged };
}

export type PersistValidation =
  | { ok: true; kind: QuickShareKind; payload: QuickSharePayload }
  | { ok: false; status: 400; error: string };

/**
 * Validate + sanitize a persist body. STRUCTURAL GUARANTEE: compare +
 * pairHasMinor + romantic framing is refused (400) — never inserted.
 */
export function validateQuickSharePersistBody(body: unknown): PersistValidation {
  if (!isPlainObject(body)) {
    return { ok: false, status: 400, error: "Invalid request." };
  }
  const kind = body.kind;
  if (kind !== "single" && kind !== "compare") {
    return { ok: false, status: 400, error: "kind must be single or compare." };
  }
  const rawPayload = body.payload;
  if (!isPlainObject(rawPayload)) {
    return { ok: false, status: 400, error: "payload is required." };
  }

  if (kind === "single") {
    const chart = sanitizeChart(rawPayload.chart);
    const displayDate = asString(rawPayload.displayDate);
    if (!chart || !displayDate) {
      return { ok: false, status: 400, error: "A computed chart and display date are required." };
    }
    const payload: SingleSharePayload = {
      displayDate,
      birthPlace: typeof rawPayload.birthPlace === "string" ? rawPayload.birthPlace : null,
      chart,
    };
    const name = asString(rawPayload.name);
    if (name) payload.name = name;
    return { ok: true, kind, payload };
  }

  // compare
  const chartA = sanitizeChart(rawPayload.chartA);
  const chartB = sanitizeChart(rawPayload.chartB);
  const generational = sanitizeGenerational(rawPayload.generational);
  const relationType = rawPayload.relationType;
  if (!chartA || !chartB || !generational) {
    return { ok: false, status: 400, error: "Both charts and a generational reading are required." };
  }
  if (relationType !== "romantic" && relationType !== "platonic") {
    return { ok: false, status: 400, error: "relationType must be romantic or platonic." };
  }
  if (typeof rawPayload.pairHasMinor !== "boolean") {
    return { ok: false, status: 400, error: "pairHasMinor is required." };
  }

  // STRUCTURAL GUARANTEE — primary safety lock. Do not weaken.
  if (rawPayload.pairHasMinor && isRomanticRelation(relationType as RelationType)) {
    return {
      ok: false,
      status: 400,
      // FOUNDER-REVIEW: authored — persist refusal when a minor + romantic framing is submitted.
      error: "Galaxia will not store a romantic reading for a pairing that includes a minor.",
    };
  }

  const synastry = sanitizeSynastry(rawPayload.synastry);
  // sanitizeSynastry returns null for both "explicit null" and "invalid".
  // Explicit null (year-only) is allowed; malformed object is not.
  if (rawPayload.synastry !== null && synastry === null) {
    return { ok: false, status: 400, error: "synastry must be null or a computed scores/aspects object." };
  }

  const payload: CompareSharePayload = {
    relationType,
    pairHasMinor: rawPayload.pairHasMinor,
    chartA,
    chartB,
    synastry,
    generational,
  };
  const nameA = asString(rawPayload.nameA);
  const nameB = asString(rawPayload.nameB);
  if (nameA) payload.nameA = nameA;
  if (nameB) payload.nameB = nameB;
  if (rawPayload.romanticHeldNotice === true) payload.romanticHeldNotice = true;

  return { ok: true, kind, payload };
}

/**
 * Render-time backstop only. Persist should have made romantic+minor impossible.
 * If a bad row somehow exists, snap to platonic + held notice — never romantic.
 * Mirrors /chart/compare after its force-Platonic effect.
 */
export function effectiveCompareFraming(payload: CompareSharePayload): {
  relationType: "romantic" | "platonic";
  blockRomanticMinorRender: boolean;
  romanticHeldNotice: boolean;
} {
  const askedRomanticWithMinor =
    payload.pairHasMinor && isRomanticRelation(payload.relationType);
  const relationType = askedRomanticWithMinor ? "platonic" : payload.relationType;
  // After the snap, romantic framing is gone — block only if still romantic.
  const blockRomanticMinorRender =
    payload.pairHasMinor && isRomanticRelation(relationType);
  return {
    relationType,
    blockRomanticMinorRender,
    romanticHeldNotice: Boolean(payload.romanticHeldNotice) || askedRomanticWithMinor,
  };
}
