import {
  buildBirthInput,
  computeNatalChart,
  CHART_ENGINE_VERSION,
  type BirthFormInput,
  type NatalChart
} from "@galaxia/astro";
import { isMinorForSafety, type GalaxyPickerRelation } from "@galaxia/core";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPreferredHouseSystem } from "./house-system";

export type PersistPersonRelation = GalaxyPickerRelation | "self";

export type PersistPersonResult = {
  personId: string;
  /** Null when birth precision is `none` — no chart was computed. */
  natal: NatalChart | null;
};

/**
 * Single write path for adding a person (self or other) + optional natal chart.
 * Used by onboarding step 2 and the standalone /app/add-person form so the
 * insert + minor-safety + chart upsert cannot drift between entry points.
 */
export async function persistPerson(
  supabase: SupabaseClient,
  {
    userId,
    displayName,
    relation,
    isSelf,
    isMinor,
    input
  }: {
    userId: string;
    displayName: string;
    relation: PersistPersonRelation;
    isSelf: boolean;
    isMinor: boolean;
    input: BirthFormInput;
  }
): Promise<PersistPersonResult> {
  // ── Progressive capture: name + relation only, no birth data yet ────────
  // No birth date exists to compute an age backstop from, so the manual
  // flag is the only signal here — isMinorForSafety still runs it through
  // the single source of truth rather than trusting the raw value inline.
  if (input.precision === "none") {
    const { data: person, error: personError } = await supabase
      .from("people")
      .insert({
        owner_id: userId,
        is_self: isSelf,
        display_name: displayName.trim(),
        relation,
        is_minor: isMinorForSafety({ isMinor, birthPrecision: "none" }),
        birth_precision: "none",
        birth_date: null,
        birth_time: null,
        birth_place: null,
        birth_lat: null,
        birth_lng: null,
        tz_offset_min: null
      })
      .select("id")
      .single();
    if (personError || !person) throw new Error(personError?.message ?? "Failed to save person.");
    return { personId: person.id, natal: null };
  }

  // buildBirthInput now throws clearly if timezone is missing for exact precision (BUG C)
  const built = buildBirthInput(input);
  const houseSystem = await getPreferredHouseSystem(supabase, userId);
  const natal = computeNatalChart({ ...built.birth, houseSystem });

  // The age backstop runs at save time too, not only when a gate reads the
  // row later — so a child is protected even if the "This person is a
  // minor" checkbox was left unchecked.
  const effectiveIsMinor = isMinorForSafety({
    isMinor,
    birthDate: built.birthDate,
    birthPrecision: input.precision
  });

  const { data: person, error: personError } = await supabase
    .from("people")
    .insert({
      owner_id: userId,
      is_self: isSelf,
      display_name: displayName.trim(),
      relation,
      is_minor: effectiveIsMinor,
      birth_date: built.birthDate,
      birth_time: built.birthTime,
      birth_place: built.birthPlace,
      birth_precision: input.precision,
      birth_lat: built.birth.lat ?? null,
      birth_lng: built.birth.lng ?? null,
      tz_offset_min: built.tzOffsetMin ?? null
    })
    .select("id")
    .single();

  if (personError || !person) throw new Error(personError?.message ?? "Failed to save person.");

  const { error: chartError } = await supabase.from("charts").upsert({
    // house_system records what was actually computed — never a claim the engine didn't fulfil
    person_id: person.id,
    house_system: natal.houseSystem ?? null,
    data: natal,
    engine_version: CHART_ENGINE_VERSION
  });
  if (chartError) throw new Error(chartError.message);
  return { personId: person.id, natal };
}
