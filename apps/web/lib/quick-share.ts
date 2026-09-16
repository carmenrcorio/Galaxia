/**
 * Token-based Quick Chart / Quick Compare share snapshots.
 *
 * Persist stores the already-computed reading (placements, orbs, scores,
 * display labels). Chart rows still strip exact birth time, lat/lng, and
 * tzOffsetMin. Gift natal shares (kind=single) may also store an allowlisted
 * `giftBirth` envelope so a recipient can add or compare without retyping;
 * that envelope never appears in the URL. Compare snapshots that pair a
 * minor with romantic framing are refused at persist time — that is the
 * structural guarantee; /s only renders stored data.
 */

import {
  COMPARE_RELATION_TYPES,
  isRomanticRelation,
  type BirthFormInput,
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

/**
 * Fields the single-chart reading visibly displays + computed engine output.
 * `name` is legacy/read-only for older rows: new single-chart snapshots are
 * nameless by design (HARD BOUNDARY — never persist a name on kind=single).
 *
 * `giftBirth` is the return-path envelope: allowlisted BirthFormInput so a
 * recipient can add this person or compare without retyping. It is stored
 * only behind the unguessable token, never in the URL, and never on compare.
 */
export type SingleSharePayload = {
  name?: string;
  displayDate: string;
  birthPlace: string | null;
  chart: NatalChart;
  giftBirth?: BirthFormInput;
};

/**
 * Post-block safe compare reading. `pairHasMinor` is stored so /s can keep
 * platonic/held framing without recomputing age from birth dates.
 */
export type CompareSharePayload = {
  nameA?: string;
  nameB?: string;
  relationType: RelationType;
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
  expires_at: string | null;
  revoked_at: string | null;
};

export type QuickShareListItem = {
  token: string;
  kind: QuickShareKind;
  created_at: string;
  expires_at: string | null;
  displayDate: string | null;
  birthPlace: string | null;
};

export const SHARE_DEFAULT_EXPIRY_DAYS = 14;

export const SHARE_EXPIRY_OPTIONS: { days: number | null; label: string }[] = [
  { days: 7, label: "7 days" },
  { days: 14, label: "14 days" },
  { days: 30, label: "30 days" },
  { days: null, label: "No expiry" },
];

export function sharePath(token: string): string {
  return `/s/${encodeURIComponent(token)}`;
}

export function giftComparePath(token: string): string {
  return `/chart/compare?gift=${encodeURIComponent(token)}`;
}

export function isShareActive(
  row: { expires_at: string | null; revoked_at: string | null },
  now: Date = new Date(),
): boolean {
  if (row.revoked_at) return false;
  if (row.expires_at && new Date(row.expires_at).getTime() <= now.getTime()) return false;
  return true;
}

export type ExpiresParse =
  | { ok: true; days: number | null }
  | { ok: false; error: string };

/**
 * Anonymous creators cannot pick "no expiry" (they cannot revoke later), so
 * `allowNever: false` coerces null to the 14-day default.
 */
export function parseExpiresInDays(value: unknown, allowNever: boolean): ExpiresParse {
  if (value === undefined) return { ok: true, days: SHARE_DEFAULT_EXPIRY_DAYS };
  if (value === null) {
    return { ok: true, days: allowNever ? null : SHARE_DEFAULT_EXPIRY_DAYS };
  }
  if (value === 7 || value === 14 || value === 30) return { ok: true, days: value };
  return { ok: false, error: "expiresInDays must be 7, 14, 30, or null." };
}

export function resolveShareExpiresAt(
  expiresInDays: number | null,
  now: Date = new Date(),
): string | null {
  if (expiresInDays === null) return null;
  return new Date(now.getTime() + expiresInDays * 86_400_000).toISOString();
}

export function giftBirthIsoDate(input: BirthFormInput): string | null {
  if (input.precision === "year" && input.yearOnly) {
    return `${input.yearOnly}-01-01`;
  }
  if (input.year && input.month && input.day) {
    const month = String(input.month).padStart(2, "0");
    const day = String(input.day).padStart(2, "0");
    return `${input.year}-${month}-${day}`;
  }
  return null;
}

export function shareInviteTimeRemaining(expiresAt: string | null, now: Date = new Date()): string {
  if (!expiresAt) return "No expiry";
  const ms = new Date(expiresAt).getTime() - now.getTime();
  if (ms <= 0) return "Expired";
  const days = Math.ceil(ms / 86_400_000);
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

export const SHARE_GALAXIA_FRAME =
  "Galaxia computes a real natal chart and says, in plain language, what this person needs.";

export const SHARE_NEED_SUBJECT = "This person";

export const SHARE_GIFT_DISCLOSURE =
  "Anyone with this link can see the natal chart, the birth date, and the birth place if you entered one. They can add this person to their own constellation or compare without retyping those details. They cannot see notes. The URL never includes a name.";

export const SHARE_COMPARE_DISCLOSURE =
  "Anyone with this link can see this compatibility reading and both charts. They cannot see notes. The URL never includes a name.";

export const SHARE_ANON_EXPIRY_NOTE =
  "Signed out: this link expires, and you cannot revoke it later. Sign in to pick no expiry, or to revoke from Settings.";

export const SHARE_SIGNED_IN_REVOKE_NOTE = "You can revoke this link from Settings.";

export const SHARE_SINGLE_LEDE =
  "A gifted natal chart. Readable with no account. Birth details are not in the URL.";

export const SHARE_COMPARE_LEDE =
  "A read-only snapshot of a Galaxia reading. Nothing here can be edited, and birth details are not in the link.";

export const SHARE_ADD_CTA = "Add this person to my own constellation";
export const SHARE_COMPARE_CTA = "See how you and this person compare";
export const SHARE_COMPARE_HINT = "You only need to enter your own birth details.";

export const SHARE_NO_GIFT_BIRTH =
  "This older link does not carry birth details, so they cannot be added or compared from here.";

export const SHARE_NEED_HEADING = "What this person needs";
export const SHARE_NEED_EMPTY =
  "There is not enough birth data in this chart to say what this person needs yet.";

export const SHARE_NEED_PROVENANCE = "Computed from their birth data. Not generated, not guessed.";

export const SHARE_NEED_GENERATIONAL =
  "A birth year settles only the slowest planets, so this describes the era that shaped them rather than them alone.";

export const SHARE_PENDING_TITLE = "Share links";
export const SHARE_PENDING_EMPTY = "No live share links right now.";
export const SHARE_PENDING_ERROR = "Could not load share links. Try again.";
export const SHARE_PENDING_LOADING = "Loading your share links.";
export const SHARE_REVOKE_LABEL = "Revoke";
export const SHARE_REVOKING_LABEL = "Revoking…";
export const SHARE_PENDING_COMPARE_LABEL = "Compatibility reading";
export const SHARE_PENDING_NATAL_FALLBACK = "Natal chart";

export const SHARE_GIFT_COMPARE_B_LOCKED = "Using the gifted chart. You only enter your own birth details.";
export const SHARE_GIFT_COMPARE_MISSING =
  "This gift link is missing, expired, or no longer available, so the other person's chart cannot be loaded.";
export const SHARE_GIFT_COMPARE_NOT_SINGLE =
  "This link is a compatibility reading, not a gifted natal chart, so it cannot be compared from here.";

export const QUICK_COMPARE_HELD_READING =
  "A minor is part of this comparison, so Galaxia won't produce a romantic reading here. Only a platonic reading is available for this pairing.";

export const QUICK_COMPARE_MINOR_NOTICE =
  "A minor is part of this comparison, so only a platonic reading is available. Romantic framing is turned off for pairings involving a child.";

/**
 * Keys that must never appear in a stored or returned snapshot payload.
 * Exported so other safety-critical consumers (e.g. the `/s` OG image route
 * and its tests) assert against this single list instead of a second,
 * possibly-drifted copy.
 */
export const FORBIDDEN_PII_KEYS = new Set([
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

/**
 * Every persistable relationType: the /app/compare picker's five types
 * (COMPARE_RELATION_TYPES) plus the two binary-only values /chart/compare's
 * simpler picker adds. Driven by the exported list, not hand-copied
 * literals, so a future 8th RelationType needs no edit here, only an
 * addition to COMPARE_RELATION_TYPES (or here, if it is binary-only) in
 * @galaxia/astro.
 */
const ALL_RELATION_TYPES = new Set<string>([...COMPARE_RELATION_TYPES, "romantic", "platonic"]);

function isRelationType(value: unknown): value is RelationType {
  return typeof value === "string" && ALL_RELATION_TYPES.has(value);
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

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/**
 * Allowlisted BirthFormInput for the gift return path. Built field-by-field
 * so stripBirthPii cannot empty it, and so a smuggled name never lands here.
 */
export function sanitizeGiftBirth(raw: unknown): BirthFormInput | undefined {
  if (!isPlainObject(raw)) return undefined;
  const precision = raw.precision;
  if (precision !== "exact" && precision !== "date" && precision !== "year") return undefined;
  const input: BirthFormInput = { precision };
  const month = finiteNumber(raw.month);
  const day = finiteNumber(raw.day);
  const year = finiteNumber(raw.year);
  const hour = finiteNumber(raw.hour);
  const minute = finiteNumber(raw.minute);
  const yearOnly = finiteNumber(raw.yearOnly);
  const tzOffsetMin = finiteNumber(raw.tzOffsetMin);
  if (month !== undefined) input.month = month;
  if (day !== undefined) input.day = day;
  if (year !== undefined) input.year = year;
  if (hour !== undefined) input.hour = hour;
  if (minute !== undefined) input.minute = minute;
  if (yearOnly !== undefined) input.yearOnly = yearOnly;
  if (tzOffsetMin !== undefined) input.tzOffsetMin = tzOffsetMin;
  const birthPlace = asString(raw.birthPlace);
  const lat = asString(raw.lat);
  const lng = asString(raw.lng);
  const tzId = asString(raw.tzId);
  if (birthPlace) input.birthPlace = birthPlace;
  if (lat) input.lat = lat;
  if (lng) input.lng = lng;
  if (tzId) input.tzId = tzId;
  if (precision === "year") return input.yearOnly ? input : undefined;
  return input.month && input.day && input.year ? input : undefined;
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
    // HARD BOUNDARY: single-chart share snapshots stay nameless. Even if a
    // client smuggles `name`, drop it before persist. (Compare may still carry
    // nameA/nameB for the two-person reading labels.)
    const payload: SingleSharePayload = {
      displayDate,
      birthPlace: typeof rawPayload.birthPlace === "string" ? rawPayload.birthPlace : null,
      chart,
    };
    const giftBirth = sanitizeGiftBirth(rawPayload.giftBirth);
    if (giftBirth) payload.giftBirth = giftBirth;
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
  if (!isRelationType(relationType)) {
    return { ok: false, status: 400, error: "relationType must be a supported relationship type." };
  }
  if (typeof rawPayload.pairHasMinor !== "boolean") {
    return { ok: false, status: 400, error: "pairHasMinor is required." };
  }

  // STRUCTURAL GUARANTEE — primary safety lock. Do not weaken.
  if (rawPayload.pairHasMinor && isRomanticRelation(relationType)) {
    return {
      ok: false,
      status: 400,
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
  relationType: RelationType;
  blockRomanticMinorRender: boolean;
  romanticHeldNotice: boolean;
} {
  const askedRomanticWithMinor =
    payload.pairHasMinor && isRomanticRelation(payload.relationType);
  const relationType: RelationType = askedRomanticWithMinor ? "platonic" : payload.relationType;
  // After the snap, romantic framing is gone — block only if still romantic.
  const blockRomanticMinorRender =
    payload.pairHasMinor && isRomanticRelation(relationType);
  return {
    relationType,
    blockRomanticMinorRender,
    romanticHeldNotice: Boolean(payload.romanticHeldNotice) || askedRomanticWithMinor,
  };
}
