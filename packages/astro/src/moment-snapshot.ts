/**
 * Stored sky for The Moment.
 *
 * The entry is what was true then. Hits are computed once at save and
 * written onto notes.transit_snapshot. Later screens read that JSON.
 * They never call computeTransits again for this row (ENGINEERING.md §12:
 * a later engine change must not rewrite the past).
 *
 * "Between you and them" is the current sky against both natal charts,
 * same 1.5° gate as Active today. Synastry is not attached: it does not
 * move with the hour, so treating it as the sky of a moment would be a
 * fabrication.
 */

import {
  computeTransits,
  type AspectType,
  type BodyName,
  type NatalChart,
  type TransitHit
} from "./index";
import { PAIR_TRANSIT_ACTIVE_ORB_DEG } from "./compare-transit-delta";

const BODIES: readonly BodyName[] = [
  "sun", "moon", "mercury", "venus", "mars",
  "jupiter", "saturn", "uranus", "neptune", "pluto"
];
const ASPECTS: readonly AspectType[] = [
  "conjunction", "sextile", "square", "trine", "opposition"
];
const WHOSE = ["you", "them"] as const;
const SIDE_HONESTY = ["ok", "year_precision", "missing_chart", "remembrance", "absent"] as const;
const OVERALL_HONESTY = ["ok", "year_precision", "missing_chart", "remembrance"] as const;

export type MomentWhose = (typeof WHOSE)[number];
export type MomentSideHonesty = (typeof SIDE_HONESTY)[number];
export type MomentHonesty = (typeof OVERALL_HONESTY)[number];

export interface MomentTransitHit {
  personId: string;
  whose: MomentWhose;
  transitBody: BodyName;
  natalBody: BodyName;
  type: AspectType;
  orb: number;
}

export interface MomentTransitSnapshot {
  whenUTC: string;
  quiet: boolean;
  honesty: MomentHonesty;
  includedYou: boolean;
  includedThem: boolean;
  youHonesty: MomentSideHonesty;
  themHonesty: MomentSideHonesty;
  hits: MomentTransitHit[];
}

export interface MomentPersonInput {
  personId: string;
  chart: NatalChart | null | undefined;
  passedAt?: string | null;
  isSelf?: boolean;
}

export interface MomentSnapshotInput {
  self: MomentPersonInput | null;
  them: MomentPersonInput;
  whenUTC: string;
}

function isBody(value: unknown): value is BodyName {
  return typeof value === "string" && (BODIES as readonly string[]).includes(value);
}

function isAspect(value: unknown): value is AspectType {
  return typeof value === "string" && (ASPECTS as readonly string[]).includes(value);
}

function isWhose(value: unknown): value is MomentWhose {
  return typeof value === "string" && (WHOSE as readonly string[]).includes(value);
}

function isSideHonesty(value: unknown): value is MomentSideHonesty {
  return typeof value === "string" && (SIDE_HONESTY as readonly string[]).includes(value);
}

function isOverallHonesty(value: unknown): value is MomentHonesty {
  return typeof value === "string" && (OVERALL_HONESTY as readonly string[]).includes(value);
}

function sideHonesty(person: MomentPersonInput | null | undefined): MomentSideHonesty {
  if (!person) return "absent";
  if (person.passedAt) return "remembrance";
  if (!person.chart) return "missing_chart";
  if (person.chart.precision === "year") return "year_precision";
  return "ok";
}

function hitsFor(
  person: MomentPersonInput,
  whose: MomentWhose,
  whenUTC: string
): MomentTransitHit[] {
  const out: MomentTransitHit[] = [];
  for (const hit of computeTransits(person.chart as NatalChart, whenUTC) as TransitHit[]) {
    if (hit.orb > PAIR_TRANSIT_ACTIVE_ORB_DEG) continue;
    out.push({
      personId: person.personId,
      whose,
      transitBody: hit.transitBody,
      natalBody: hit.natalBody,
      type: hit.type,
      orb: hit.orb
    });
  }
  return out;
}

function sortHits(hits: MomentTransitHit[]): MomentTransitHit[] {
  return [...hits].sort((a, b) => {
    if (a.orb !== b.orb) return a.orb - b.orb;
    const ak = `${a.whose}|${a.transitBody}|${a.type}|${a.natalBody}`;
    const bk = `${b.whose}|${b.transitBody}|${b.type}|${b.natalBody}`;
    return ak.localeCompare(bk);
  });
}

function overallFromSides(
  you: MomentSideHonesty,
  them: MomentSideHonesty,
  includedYou: boolean,
  includedThem: boolean
): MomentHonesty {
  if (includedYou || includedThem) return "ok";
  if (them === "remembrance" && (you === "absent" || you === "remembrance")) return "remembrance";
  if (them === "year_precision" || you === "year_precision") return "year_precision";
  if (them === "missing_chart" || you === "missing_chart") return "missing_chart";
  if (them === "remembrance") return "remembrance";
  return "missing_chart";
}

/**
 * Compute the sky at `whenUTC` for the owner and the named person.
 * Year-only and remembrance charts are skipped, never guessed.
 */
export function captureMomentSnapshot(input: MomentSnapshotInput): MomentTransitSnapshot {
  const aboutSelf = Boolean(input.them.isSelf) || input.self?.personId === input.them.personId;

  const youPerson = aboutSelf ? (input.self ?? input.them) : input.self;
  const themPerson = aboutSelf ? null : input.them;

  const youHonesty = sideHonesty(youPerson);
  const themHonesty = aboutSelf ? "absent" : sideHonesty(themPerson);
  const includedYou = youHonesty === "ok";
  const includedThem = themHonesty === "ok";

  const hits: MomentTransitHit[] = [];
  if (includedYou && youPerson) hits.push(...hitsFor(youPerson, "you", input.whenUTC));
  if (includedThem && themPerson) hits.push(...hitsFor(themPerson, "them", input.whenUTC));

  const sorted = sortHits(hits);
  return {
    whenUTC: input.whenUTC,
    quiet: sorted.length === 0,
    honesty: overallFromSides(youHonesty, themHonesty, includedYou, includedThem),
    includedYou,
    includedThem,
    youHonesty,
    themHonesty,
    hits: sorted
  };
}

function parseHit(raw: unknown): MomentTransitHit | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.personId !== "string" || !row.personId) return null;
  if (!isWhose(row.whose)) return null;
  if (!isBody(row.transitBody) || !isBody(row.natalBody)) return null;
  if (!isAspect(row.type)) return null;
  if (typeof row.orb !== "number" || !Number.isFinite(row.orb)) return null;
  return {
    personId: row.personId,
    whose: row.whose,
    transitBody: row.transitBody,
    natalBody: row.natalBody,
    type: row.type,
    orb: row.orb
  };
}

/**
 * Read a stored snapshot. Unknown fields and invented bodies are dropped.
 * Returns null when the row is not a snapshot, so the UI can say so rather
 * than recompute or invent hits.
 */
export function parseMomentTransitSnapshot(raw: unknown): MomentTransitSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.whenUTC !== "string" || !row.whenUTC) return null;
  if (!isOverallHonesty(row.honesty)) return null;
  if (typeof row.quiet !== "boolean") return null;
  if (typeof row.includedYou !== "boolean" || typeof row.includedThem !== "boolean") return null;
  if (!isSideHonesty(row.youHonesty) || !isSideHonesty(row.themHonesty)) return null;
  if (!Array.isArray(row.hits)) return null;
  const hits: MomentTransitHit[] = [];
  for (const item of row.hits) {
    const hit = parseHit(item);
    if (hit) hits.push(hit);
  }
  return {
    whenUTC: row.whenUTC,
    quiet: hits.length === 0,
    honesty: row.honesty,
    includedYou: row.includedYou,
    includedThem: row.includedThem,
    youHonesty: row.youHonesty,
    themHonesty: row.themHonesty,
    hits: sortHits(hits)
  };
}
