import {
  buildBirthInput,
  computeNatalChart,
  CHART_ENGINE_VERSION,
  type BirthFormInput,
  type NatalChart
} from "@galaxia/astro";
import {
  createPerson,
  type CreatePersonBirth,
  type CreatePersonRelation,
  type GalaxyPickerRelation,
  type PeopleInsertClient
} from "@galaxia/core";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPreferredHouseSystem } from "./house-system";

export type PersistPersonRelation = CreatePersonRelation;

export type PersistPersonResult = {
  personId: string;
  natal: NatalChart | null;
  isMinor: boolean;
  relation: PersistPersonRelation;
  refusedRelation: GalaxyPickerRelation | null;
};

/**
 * Same people-row write as web: createPerson in @galaxia/core, then optional
 * natal chart. Identical input produces identical people rows.
 */
export async function persistPerson(
  supabase: SupabaseClient,
  {
    userId,
    displayName,
    relation,
    isSelf,
    isMinor,
    input,
    passedAt = null
  }: {
    userId: string;
    displayName: string;
    relation: PersistPersonRelation;
    isSelf: boolean;
    isMinor: boolean;
    input: BirthFormInput;
    passedAt?: string | null;
  }
): Promise<PersistPersonResult> {
  let natal: NatalChart | null = null;
  let birth: CreatePersonBirth;

  if (input.precision === "none") {
    birth = { precision: "none" };
  } else {
    const built = buildBirthInput(input);
    const houseSystem = await getPreferredHouseSystem(supabase, userId);
    natal = computeNatalChart({ ...built.birth, houseSystem });
    birth = {
      precision: input.precision,
      birthDate: built.birthDate,
      birthTime: built.birthTime,
      birthPlace: built.birthPlace,
      birthLat: built.birth.lat ?? null,
      birthLng: built.birth.lng ?? null,
      tzOffsetMin: built.tzOffsetMin ?? null
    };
  }

  const created = await createPerson(supabase as unknown as PeopleInsertClient, {
    userId,
    displayName,
    relation,
    isSelf,
    isMinor,
    birth,
    passedAt
  });

  if (natal) {
    const { error: chartError } = await supabase.from("charts").upsert({
      person_id: created.id,
      house_system: natal.houseSystem ?? null,
      data: natal,
      engine_version: CHART_ENGINE_VERSION
    });
    if (chartError) throw new Error(chartError.message);
  }

  return {
    personId: created.id,
    natal,
    isMinor: created.is_minor,
    relation: created.relation,
    refusedRelation: created.refusedRelation
  };
}
