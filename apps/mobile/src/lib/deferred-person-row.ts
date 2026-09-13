import { isMinorForSafety, type GalaxyPickerRelation } from "@galaxia/core";

export type DeferredPersonRow = {
  owner_id: string;
  is_self: boolean;
  display_name: string;
  relation: GalaxyPickerRelation | "self";
  is_minor: boolean;
  birth_precision: "none";
  birth_date: null;
  birth_time: null;
  birth_place: null;
  birth_lat: null;
  birth_lng: null;
  tz_offset_min: null;
};

/**
 * The `people` insert for progressive capture: name and relation now, birth
 * data later. Same row shape web writes in the `precision === "none"` branch of
 * apps/web/lib/persist-person.ts.
 *
 * Every birth column stays null. There is no date to derive an age backstop
 * from, so the manual flag is the only minor signal here, and it still goes
 * through isMinorForSafety rather than being trusted inline.
 */
export function deferredPersonRow({
  ownerId,
  displayName,
  relation,
  isSelf,
  isMinor
}: {
  ownerId: string;
  displayName: string;
  relation: GalaxyPickerRelation | "self";
  isSelf: boolean;
  isMinor: boolean;
}): DeferredPersonRow {
  return {
    owner_id: ownerId,
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
  };
}
