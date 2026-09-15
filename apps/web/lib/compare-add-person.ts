import { safeNextPath } from "./safe-next-path";

export const COMPARE_PATH = "/app/compare";
export const ADD_PERSON_PATH = "/app/add-person";

/**
 * Slot to fill after adding a person from Compare. Prefer the empty slot;
 * if both are filled, Person B (the "other" person; A is usually self).
 */
export function emptyCompareSlot(
  personAId: string | null | undefined,
  personBId: string | null | undefined
): "a" | "b" {
  if (!personAId) return "a";
  return "b";
}

/** Link from Compare to the shared add-person page, carrying the return pair. */
export function compareAddPersonHref(input: {
  personAId: string | null;
  personBId: string | null;
  fillSlot: "a" | "b";
}): string {
  const params = new URLSearchParams();
  params.set("next", COMPARE_PATH);
  params.set("slot", input.fillSlot);
  if (input.personAId) params.set("a", input.personAId);
  if (input.personBId) params.set("b", input.personBId);
  return `${ADD_PERSON_PATH}?${params.toString()}`;
}

/**
 * After a person is saved on /app/add-person, return to Compare with that
 * person in the requested slot. Null when this was not a Compare hand-off.
 */
export function comparePathAfterAddPerson(input: {
  next: string | null;
  slot: string | null;
  personAId: string | null;
  personBId: string | null;
  newPersonId: string;
}): string | null {
  const next = safeNextPath(input.next, "");
  if (next !== COMPARE_PATH && !next.startsWith(`${COMPARE_PATH}?`)) return null;
  const slot = input.slot === "a" ? "a" : "b";
  const a = slot === "a" ? input.newPersonId : input.personAId;
  const b = slot === "b" ? input.newPersonId : input.personBId;
  const params = new URLSearchParams();
  if (a) params.set("a", a);
  if (b) params.set("b", b);
  const query = params.toString();
  return query ? `${COMPARE_PATH}?${query}` : COMPARE_PATH;
}
