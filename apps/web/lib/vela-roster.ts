import { initialComparePairIds } from "@galaxia/astro";
import type { GroupPickerOption } from "../components/group-picker-field";
import type { PersonPickerOption } from "../components/person-picker";

export type VelaPersonRow = {
  id: string;
  display_name: string;
  relation: string | null | undefined;
  is_minor: boolean;
  birth_date: string | null;
  birth_precision: "none" | "exact" | "date" | "year" | null;
  passed_at?: string | null;
  sunSign?: string | null;
};

export type VelaGroupRow = {
  id: string;
  name: string;
  memberCount?: number;
};

export function toVelaPeople(rows: readonly VelaPersonRow[]): PersonPickerOption[] {
  return rows.map((person) => ({
    id: person.id,
    display_name: person.display_name,
    relation: person.relation ?? "",
    sun: person.sunSign ?? null,
    passed_at: person.passed_at ?? null,
    is_minor: person.is_minor,
    birth_date: person.birth_date,
    birth_precision: person.birth_precision
  }));
}

export function toVelaGroups(rows: readonly VelaGroupRow[]): GroupPickerOption[] {
  return rows.map((group) => ({
    id: group.id,
    displayName: group.name,
    memberCount: group.memberCount
  }));
}

export function velaDefaultSubjectId(
  current: string | null,
  people: readonly { id: string; relation: string | null | undefined }[]
): string | null {
  if (current !== null) return current;
  return initialComparePairIds(people).personAId;
}
