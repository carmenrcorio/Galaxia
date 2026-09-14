import type { BirthFormInput, FormPrecision } from "@galaxia/astro";
import {
  knownBirthMonthDay,
  knownBirthYear,
  type ChartPrecision,
} from "@galaxia/core";

type PersonBirthRow = {
  birth_precision: ChartPrecision | string;
  birth_date?: string | null;
  birth_time?: string | null;
  birth_place?: string | null;
  birth_lat?: number | null;
  birth_lng?: number | null;
  tz_offset_min?: number | null;
};

function parseTimeStr(s: string | null | undefined): { hour?: number; minute?: number } {
  if (!s) return {};
  const [hr, mn] = s.slice(0, 5).split(":").map(Number);
  return {
    hour: Number.isFinite(hr) ? hr : undefined,
    minute: Number.isFinite(mn) ? mn : undefined,
  };
}

/**
 * Prefill the edit form with what is actually known. Year-only never
 * contributes January 1 as a birthday (ENGINEERING.md §12).
 */
export function birthFormFromPerson(person: PersonBirthRow): BirthFormInput {
  const precision = (person.birth_precision === "none" ? "date" : person.birth_precision) as FormPrecision;
  const year = knownBirthYear(person.birth_precision, person.birth_date);
  const md = knownBirthMonthDay(person.birth_precision, person.birth_date);
  const time = parseTimeStr(person.birth_time);
  return {
    precision: person.birth_precision === "year" ? "year" : precision,
    year: md ? year : person.birth_precision === "year" ? undefined : year,
    month: md?.month,
    day: md?.day,
    yearOnly: person.birth_precision === "year" ? year : undefined,
    ...time,
    birthPlace: person.birth_place ?? "",
    lat: person.birth_lat != null ? String(person.birth_lat) : "",
    lng: person.birth_lng != null ? String(person.birth_lng) : "",
    tzOffsetMin: person.tz_offset_min != null ? person.tz_offset_min : undefined,
  };
}

/**
 * One-rung upgrade: keep known fields, switch the form to the missing detail.
 * Year → date keeps the year and leaves month/day empty.
 * Date → exact keeps the date and place; time stays empty unless already stored.
 */
export function applyBirthFormUpgrade(
  form: BirthFormInput,
  target: Exclude<ChartPrecision, "none">
): BirthFormInput {
  if (target === "date") {
    const year = form.yearOnly ?? form.year;
    return {
      ...form,
      precision: "date",
      year,
      yearOnly: undefined,
      month: form.precision === "year" ? undefined : form.month,
      day: form.precision === "year" ? undefined : form.day,
    };
  }
  const year = form.yearOnly ?? form.year;
  return {
    ...form,
    precision: "exact",
    year,
    yearOnly: undefined,
    month: form.precision === "year" ? undefined : form.month,
    day: form.precision === "year" ? undefined : form.day,
  };
}
