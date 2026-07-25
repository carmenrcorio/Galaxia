import type { NatalChart, Precision } from "../index";
import { eligibleNudgeHits, precisionModeFromChart } from "./eligibility";
import { nudgeFramingFromRelation } from "./framing";
import { resolveNudgeCopy } from "./resolve-copy";
import { selectDailyHit } from "./selection";
import type { PersonDailyNudgeRecord } from "./types";

export interface BuildDailyNudgeInput {
  ownerId: string;
  personId: string;
  /** Owner-local calendar day YYYY-MM-DD. */
  date: string;
  /** Instant used for ephemeris (typically local noon as UTC ISO). */
  whenUTC: string;
  chart: NatalChart | null | undefined;
  birthPrecision?: Precision | "none" | null;
  birthDate?: string | null;
  relation?: string | null;
  isSelf?: boolean;
  /** isMinorForSafety result — set at generation. */
  minorSafe: boolean;
  /** pass_ids already shown recently for this person (novelty). */
  recentPassIds?: ReadonlySet<string>;
}

/**
 * Pure builder for one person_daily_nudges row. Deterministic for a given
 * input — callers upsert once per (person_id, date); home reads the frozen
 * copy_resolved and never recomputes sentences on open.
 */
export function buildPersonDailyNudge(input: BuildDailyNudgeInput): PersonDailyNudgeRecord {
  const framing = nudgeFramingFromRelation(input.relation, Boolean(input.isSelf));
  const precisionMode = precisionModeFromChart(input.chart, input.birthPrecision);
  const recent = input.recentPassIds ?? new Set<string>();

  if (precisionMode === "year_blocked" || precisionMode === "none" || !input.chart) {
    const copy = resolveNudgeCopy({
      hit: null,
      framing,
      minorSafe: input.minorSafe,
      precisionMode: precisionMode === "none" || !input.chart ? "none" : "year_blocked",
    });
    return {
      owner_id: input.ownerId,
      person_id: input.personId,
      date: input.date,
      transit_body: null,
      natal_body: null,
      aspect_type: null,
      aspect_class: null,
      orb_deg: null,
      phase: null,
      exact_at: null,
      pass_id: null,
      copy_key: copy.copy_key,
      copy_tier: copy.copy_tier,
      copy_resolved: copy.copy_resolved,
      relationship_framing: framing,
      precision_mode: !input.chart && precisionMode !== "year_blocked" ? "none" : precisionMode,
      minor_safe: input.minorSafe,
      selection_reason: { reason: "ineligible_precision" },
    };
  }

  const hits = eligibleNudgeHits({
    chart: input.chart,
    whenUTC: input.whenUTC,
    precisionMode,
    birthDate: input.birthDate,
  });
  const picked = selectDailyHit(hits, framing, input.minorSafe, recent);
  const copy = resolveNudgeCopy({
    hit: picked?.hit ?? null,
    framing,
    minorSafe: input.minorSafe,
    precisionMode,
  });

  const hit = picked?.hit ?? null;
  // Never-fabricate: date_sign must not store a precise orb_deg.
  const orbDeg =
    hit && precisionMode === "exact" ? Number(hit.orb.toFixed(2)) : null;

  return {
    owner_id: input.ownerId,
    person_id: input.personId,
    date: input.date,
    transit_body: hit?.transitBody ?? null,
    natal_body: hit?.natalBody ?? null,
    aspect_type: hit?.type ?? null,
    aspect_class: hit?.aspectClass ?? null,
    orb_deg: orbDeg,
    phase: hit?.phase ?? null,
    exact_at: hit?.exactAt ?? null,
    pass_id: hit?.passId ?? null,
    copy_key: copy.copy_key,
    copy_tier: copy.copy_tier,
    copy_resolved: copy.copy_resolved,
    relationship_framing: framing,
    precision_mode: precisionMode,
    minor_safe: input.minorSafe,
    selection_reason: picked
      ? {
          score: picked.score,
          parts: picked.parts,
          candidates: hits.length,
        }
      : { reason: "no_eligible_hit", candidates: hits.length },
  };
}
