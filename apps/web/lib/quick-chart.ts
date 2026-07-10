import type { BirthFormInput } from "./birth";

/**
 * Encode/decode birth data into URL query params, for:
 *  - Quick Chart share links (/chart, /chart/compare) — NEVER includes a name.
 *    "Birth data in a URL is acceptable; a person's name tied to birth data in
 *    a public URL is not."
 *  - the /welcome "prefill" carry-through after Quick Chart's "Save to your
 *    galaxy" → /signup?next=/welcome?prefill=... flow (name travels separately,
 *    as its own top-level `name` param, and is never persisted until the user
 *    explicitly saves the person).
 *
 * Optional `prefix` supports encoding two people in one URL (Quick Compare
 * uses "a_" / "b_").
 */

const KEYS = {
  precision: "pr",
  month: "m",
  day: "d",
  year: "y",
  hour: "h",
  minute: "mi",
  yearOnly: "yo",
  lat: "lat",
  lng: "lng",
  tzOffsetMin: "tz",
  tzId: "tzid",
  birthPlace: "pl",
} as const;

export function encodeBirthQuery(input: BirthFormInput, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  const set = (key: string, value: string | number | undefined | null) => {
    if (value === undefined || value === null || value === "") return;
    out[`${prefix}${key}`] = String(value);
  };
  set(KEYS.precision, input.precision);
  set(KEYS.month, input.month);
  set(KEYS.day, input.day);
  set(KEYS.year, input.year);
  set(KEYS.hour, input.hour);
  set(KEYS.minute, input.minute);
  set(KEYS.yearOnly, input.yearOnly);
  set(KEYS.lat, input.lat);
  set(KEYS.lng, input.lng);
  set(KEYS.tzOffsetMin, input.tzOffsetMin);
  set(KEYS.tzId, input.tzId);
  set(KEYS.birthPlace, input.birthPlace);
  return out;
}

export function birthQueryToSearchParams(input: BirthFormInput, prefix = ""): URLSearchParams {
  return new URLSearchParams(encodeBirthQuery(input, prefix));
}

function num(v: string | null): number | undefined {
  if (v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** Returns null if there isn't enough data to form a valid birth input. */
export function decodeBirthQuery(params: URLSearchParams, prefix = ""): BirthFormInput | null {
  const precision = params.get(`${prefix}${KEYS.precision}`);
  if (precision !== "exact" && precision !== "date" && precision !== "year") return null;

  const input: BirthFormInput = {
    precision,
    month: num(params.get(`${prefix}${KEYS.month}`)),
    day: num(params.get(`${prefix}${KEYS.day}`)),
    year: num(params.get(`${prefix}${KEYS.year}`)),
    hour: num(params.get(`${prefix}${KEYS.hour}`)),
    minute: num(params.get(`${prefix}${KEYS.minute}`)),
    yearOnly: num(params.get(`${prefix}${KEYS.yearOnly}`)),
    lat: params.get(`${prefix}${KEYS.lat}`) ?? "",
    lng: params.get(`${prefix}${KEYS.lng}`) ?? "",
    tzOffsetMin: num(params.get(`${prefix}${KEYS.tzOffsetMin}`)),
    tzId: params.get(`${prefix}${KEYS.tzId}`) ?? undefined,
    birthPlace: params.get(`${prefix}${KEYS.birthPlace}`) ?? "",
  };

  if (precision === "year") return input.yearOnly ? input : null;
  return input.month && input.day && input.year ? input : null;
}

/** Build the /welcome?prefill=...&name=... URL a signed-out Quick Chart visitor
 *  is sent to after account creation (via /signup?next=). Name is carried only
 *  through this one-time redirect chain — never stored, never in a share link. */
export function buildWelcomePrefillPath(input: BirthFormInput, name?: string): string {
  const params = birthQueryToSearchParams(input);
  if (name?.trim()) params.set("name", name.trim());
  return `/welcome?${params.toString()}`;
}
