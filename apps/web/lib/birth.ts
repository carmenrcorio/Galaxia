import type { Birth, Precision } from "@galaxia/astro";

export interface BirthFormInput {
  precision: Precision;
  date: string;
  time: string;
  year: string;
  birthPlace?: string;
  lat?: string;
  lng?: string;
  /** UTC offset in minutes at the birth place on the birth date (from tz-lookup + Intl). */
  tzOffsetMin?: number;
}

function parseOptionalFloat(value?: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Convert local birth time to UTC.
 * If tzOffsetMin is provided, subtract it from local time to get UTC.
 * e.g. 14:30 local at UTC+3 (offset=180) → 14:30 - 180min = 11:30 UTC
 *
 * Without a timezone offset (old data / no geocode yet), we fall back to
 * treating the time as UTC — callers should surface this degradation.
 */
function localTimeToUTC(date: string, time: string, tzOffsetMin?: number): string {
  if (tzOffsetMin === undefined || tzOffsetMin === null) {
    // No timezone known — store as-is and note the degradation.
    // This is the old (wrong) behavior; we surface it in the UI.
    return `${date}T${time}:00.000Z`;
  }
  // Parse local datetime components
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  if ([year, month, day, hour, minute].some(n => !Number.isFinite(n))) {
    return `${date}T${time}:00.000Z`;
  }
  // Build a Date from local components then subtract the UTC offset
  const localMs = Date.UTC(year, month - 1, day, hour, minute, 0);
  const utcMs   = localMs - tzOffsetMin * 60_000;
  return new Date(utcMs).toISOString();
}

export function buildBirthInput(input: BirthFormInput): {
  birth: Birth;
  birthDate: string;
  birthTime: string | null;
  birthPlace: string | null;
  tzOffsetMin: number | null;
  hadTimezone: boolean;
} {
  const normalizedPlace = input.birthPlace?.trim() ? input.birthPlace.trim() : null;

  if (input.precision === "year") {
    const year = Number(input.year);
    if (!Number.isInteger(year) || year < 1800 || year > 2200) {
      throw new Error("Enter a valid birth year.");
    }
    return {
      birth: {
        dateUTC: `${year}-01-01T00:00:00.000Z`,
        precision: "year",
        lat: parseOptionalFloat(input.lat),
        lng: parseOptionalFloat(input.lng)
      },
      birthDate:   `${year}-01-01`,
      birthTime:   null,
      birthPlace:  normalizedPlace,
      tzOffsetMin: input.tzOffsetMin ?? null,
      hadTimezone: input.tzOffsetMin !== undefined,
    };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    throw new Error("Use YYYY-MM-DD for birth date.");
  }

  if (input.precision === "exact" && !/^\d{2}:\d{2}$/.test(input.time)) {
    throw new Error("Use HH:MM (24h) for exact birth time.");
  }

  const dateUTC = input.precision === "exact"
    ? localTimeToUTC(input.date, input.time, input.tzOffsetMin)
    : `${input.date}T12:00:00.000Z`;

  return {
    birth: {
      dateUTC,
      precision: input.precision,
      lat: parseOptionalFloat(input.lat),
      lng: parseOptionalFloat(input.lng),
      tzOffsetMin: input.tzOffsetMin,
    },
    birthDate:   input.date,
    birthTime:   input.precision === "exact" ? `${input.time}:00` : null,
    birthPlace:  normalizedPlace,
    tzOffsetMin: input.tzOffsetMin ?? null,
    hadTimezone: input.tzOffsetMin !== undefined,
  };
}
