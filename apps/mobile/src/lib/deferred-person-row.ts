import { buildPersonInsertRow, type GalaxyPickerRelation, type PersonInsertRow } from "@galaxia/core";

export type DeferredPersonRow = Omit<PersonInsertRow, "passed_at">;

/**
 * The `people` insert for progressive capture: name and relation now, birth
 * data later. Delegates to `@galaxia/core` createPerson so mobile and web
 * write the same row.
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
  const { row } = buildPersonInsertRow({
    userId: ownerId,
    displayName,
    relation,
    isSelf,
    isMinor,
    birth: { precision: "none" }
  });
  const { passed_at: _passedAt, ...rest } = row;
  return rest;
}
