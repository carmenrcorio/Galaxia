import type { NatalChart, Precision } from "../index";
import { buildPersonDailyNudge } from "./build-record";
import type { PersonDailyNudgeRecord } from "./types";

export interface SkyPersonInput {
  id: string;
  relation?: string | null;
  is_self?: boolean;
  birth_precision?: Precision | "none" | null;
  birth_date?: string | null;
  minorSafe: boolean;
}

/**
 * Given today's existing rows + charts, return rows to upsert (missing only)
 * and the full display set. Never rebuilds a row that already exists for
 * (person_id, date) — copy stays frozen once written.
 */
export function planDailyNudgeWrites(input: {
  ownerId: string;
  date: string;
  whenUTC: string;
  people: SkyPersonInput[];
  chartsById: Map<string, NatalChart | null | undefined>;
  existingRows: PersonDailyNudgeRecord[];
  recentPassIdsByPerson?: Map<string, ReadonlySet<string>>;
}): {
  rowsToUpsert: PersonDailyNudgeRecord[];
  rowsForDisplay: PersonDailyNudgeRecord[];
} {
  const existingByPerson = new Map(input.existingRows.map((r) => [r.person_id, r]));
  const rowsToUpsert: PersonDailyNudgeRecord[] = [];
  const rowsForDisplay: PersonDailyNudgeRecord[] = [];

  for (const person of input.people) {
    const existing = existingByPerson.get(person.id);
    if (existing) {
      rowsForDisplay.push(existing);
      continue;
    }
    const row = buildPersonDailyNudge({
      ownerId: input.ownerId,
      personId: person.id,
      date: input.date,
      whenUTC: input.whenUTC,
      chart: input.chartsById.get(person.id),
      birthPrecision: person.birth_precision,
      birthDate: person.birth_date,
      relation: person.relation,
      isSelf: person.is_self,
      minorSafe: person.minorSafe,
      recentPassIds: input.recentPassIdsByPerson?.get(person.id),
    });
    rowsToUpsert.push(row);
    rowsForDisplay.push(row);
  }

  return { rowsToUpsert, rowsForDisplay };
}

/** Map a DB row (snake_case) into the typed record. */
export function coerceDailyNudgeRow(row: Record<string, unknown>): PersonDailyNudgeRecord {
  return {
    owner_id: String(row.owner_id),
    person_id: String(row.person_id),
    date: String(row.date).slice(0, 10),
    transit_body: (row.transit_body as PersonDailyNudgeRecord["transit_body"]) ?? null,
    natal_body: (row.natal_body as PersonDailyNudgeRecord["natal_body"]) ?? null,
    aspect_type: (row.aspect_type as PersonDailyNudgeRecord["aspect_type"]) ?? null,
    aspect_class: (row.aspect_class as PersonDailyNudgeRecord["aspect_class"]) ?? null,
    orb_deg: row.orb_deg == null ? null : Number(row.orb_deg),
    phase: (row.phase as PersonDailyNudgeRecord["phase"]) ?? null,
    exact_at: row.exact_at == null ? null : String(row.exact_at),
    pass_id: row.pass_id == null ? null : String(row.pass_id),
    copy_key: String(row.copy_key),
    copy_tier: row.copy_tier as PersonDailyNudgeRecord["copy_tier"],
    copy_resolved: String(row.copy_resolved),
    relationship_framing: row.relationship_framing as PersonDailyNudgeRecord["relationship_framing"],
    precision_mode: row.precision_mode as PersonDailyNudgeRecord["precision_mode"],
    minor_safe: Boolean(row.minor_safe),
    selection_reason: (row.selection_reason as Record<string, unknown>) ?? null,
  };
}
