import { isMinorForSafety } from "@galaxia/core";
import type { BirthFormInput } from "@galaxia/astro";

type BuiltBirthFields = {
  birthDate: string;
  birthTime: string | null;
  birthPlace: string | null;
  birth: { lat?: number; lng?: number };
  tzOffsetMin?: number | null;
};

/**
 * People-row patch written when a birth_data invite is accepted.
 *
 * `is_minor` is a ratchet: `isMinorForSafety` can only RAISE the flag to
 * true. There is no column distinguishing "owner manually checked minor" from
 * "computed," so writing false would silently un-flag a correctly flagged
 * minor. When the submitted date does not compute as under-18, the key is
 * omitted and the existing value is left untouched.
 */
export function inviteAcceptPeopleUpdate(
  built: BuiltBirthFields,
  precision: BirthFormInput["precision"]
): {
  birth_date: string;
  birth_time: string | null;
  birth_place: string | null;
  birth_precision: BirthFormInput["precision"];
  birth_lat: number | null;
  birth_lng: number | null;
  tz_offset_min: number | null;
  is_minor?: true;
} {
  const patch: {
    birth_date: string;
    birth_time: string | null;
    birth_place: string | null;
    birth_precision: BirthFormInput["precision"];
    birth_lat: number | null;
    birth_lng: number | null;
    tz_offset_min: number | null;
    is_minor?: true;
  } = {
    birth_date: built.birthDate,
    birth_time: built.birthTime,
    birth_place: built.birthPlace,
    birth_precision: precision,
    birth_lat: built.birth.lat ?? null,
    birth_lng: built.birth.lng ?? null,
    tz_offset_min: built.tzOffsetMin ?? null
  };

  if (
    isMinorForSafety({
      isMinor: false,
      birthDate: built.birthDate,
      birthPrecision: precision
    })
  ) {
    patch.is_minor = true;
  }

  return patch;
}
