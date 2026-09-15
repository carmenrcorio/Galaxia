/**
 * Single write path for a `people` row.
 *
 * Every surface that adds a person (web onboarding, /app/add-person, mobile
 * onboarding, Quick Chart save, Quick Check, inline add) must call this.
 * Name trim, relation normalisation, is_minor, birth_precision, and the
 * insert live here so two sites cannot drift (ENGINEERING.md §9).
 */

import { isMinorForSafety, type MinorSafetyInput } from "./minor-safety";
import type { GalaxyPickerRelation } from "./galaxy-orbit";
import { minorSafeRelation } from "./first-run";
import type { ChartPrecision } from "./chart-precision";

export type CreatePersonRelation = GalaxyPickerRelation | "self";

export type CreatePersonBirth =
  | { precision: "none" }
  | {
      precision: Exclude<ChartPrecision, "none">;
      birthDate: string;
      birthTime: string | null;
      birthPlace: string | null;
      birthLat: number | null;
      birthLng: number | null;
      tzOffsetMin: number | null;
    };

export type CreatePersonInput = {
  userId: string;
  displayName: string;
  relation: CreatePersonRelation;
  isSelf: boolean;
  isMinor: boolean;
  birth: CreatePersonBirth;
  /**
   * ISO timestamp when this person is being added in remembrance. Normally
   * null: the remembrance toggle on an existing profile is the usual path.
   */
  passedAt?: string | null;
  now?: Date;
};

export type PersonInsertRow = {
  owner_id: string;
  is_self: boolean;
  display_name: string;
  relation: CreatePersonRelation;
  is_minor: boolean;
  birth_precision: ChartPrecision;
  birth_date: string | null;
  birth_time: string | null;
  birth_place: string | null;
  birth_lat: number | null;
  birth_lng: number | null;
  tz_offset_min: number | null;
  passed_at: string | null;
};

export type CreatedPerson = PersonInsertRow & {
  id: string;
  refusedRelation: GalaxyPickerRelation | null;
};

/**
 * The subset of the Supabase client createPerson actually uses. Duck-typed
 * so @galaxia/core does not take a supabase-js dependency.
 */
export type PeopleInsertClient = {
  from: (table: "people") => {
    insert: (row: PersonInsertRow) => {
      select: (columns: string) => {
        single: () => PromiseLike<{ data: { id: string } | null; error: { message: string } | null }>;
      };
    };
  };
};

function safetyInput(
  isMinor: boolean,
  birth: CreatePersonBirth
): MinorSafetyInput {
  if (birth.precision === "none") {
    return { isMinor, birthPrecision: "none" };
  }
  return {
    isMinor,
    birthDate: birth.birthDate,
    birthPrecision: birth.precision
  };
}

function safeRelationForCreate(
  relation: CreatePersonRelation,
  person: MinorSafetyInput,
  now?: Date
): { relation: CreatePersonRelation; isMinor: boolean; refusedRelation: GalaxyPickerRelation | null } {
  if (relation === "self") {
    return { relation, isMinor: isMinorForSafety(person, now), refusedRelation: null };
  }
  const resolved = minorSafeRelation(relation, person, now);
  return { relation: resolved.relation, isMinor: resolved.isMinor, refusedRelation: resolved.refused };
}

/**
 * The row that will be inserted. Pure: same input, same row, no I/O.
 * Callers that compute a natal chart still go through createPerson for the
 * write; this exists so tests can prove two surfaces would persist identically.
 */
export function buildPersonInsertRow(input: CreatePersonInput): {
  row: PersonInsertRow;
  refusedRelation: GalaxyPickerRelation | null;
} {
  const displayName = input.displayName.trim();
  if (!displayName) {
    throw new Error("A name is required.");
  }
  const person = safetyInput(input.isMinor, input.birth);
  const safety = safeRelationForCreate(input.relation, person, input.now);
  const birth = input.birth;
  const birthFields =
    birth.precision === "none"
      ? {
          birth_date: null,
          birth_time: null,
          birth_place: null,
          birth_lat: null,
          birth_lng: null,
          tz_offset_min: null
        }
      : {
          birth_date: birth.birthDate,
          birth_time: birth.birthTime,
          birth_place: birth.birthPlace,
          birth_lat: birth.birthLat,
          birth_lng: birth.birthLng,
          tz_offset_min: birth.tzOffsetMin
        };
  return {
    row: {
      owner_id: input.userId,
      is_self: input.isSelf,
      display_name: displayName,
      relation: safety.relation,
      is_minor: safety.isMinor,
      birth_precision: birth.precision,
      ...birthFields,
      passed_at: input.passedAt ?? null
    },
    refusedRelation: safety.refusedRelation
  };
}

/**
 * Insert one people row. The only `.from("people").insert` in production code.
 */
export async function createPerson(
  client: PeopleInsertClient,
  input: CreatePersonInput
): Promise<CreatedPerson> {
  const { row, refusedRelation } = buildPersonInsertRow(input);
  const { data, error } = await client
    .from("people")
    .insert(row)
    .select("id")
    .single();
  if (error || !data) {
    if (error?.message?.includes("people_one_self_per_owner")) {
      throw new Error("people_one_self_per_owner");
    }
    // FOUNDER-REVIEW: person insert failed. Never pass a database error through.
    throw new Error("This person could not be saved. Try again.");
  }
  return { ...row, id: data.id, refusedRelation };
}
