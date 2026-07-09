import type { Birth, Precision } from "@galaxia/astro";

export interface BirthFormInput {
  precision: Precision;

  // For "date" and "exact" precision — structured values, NOT raw text
  month?: number;   // 1-12
  day?:   number;   // 1-31
  year?:  number;   // 1800-present

  // For "exact" precision
  hour?:   number;  // 0-23
  minute?: number;  // 0-59

  // For "year" precision
  yearOnly?: number;

  // Location (resolved via geocoder, never free-typed)
  birthPlace?: string;    // display label, e.g. "Jacksonville, Arkansas, United States"
  lat?: string;
  lng?: string;
  /** UTC offset in minutes at the birth place on the birth date. REQUIRED for exact precision. */
  tzOffsetMin?: number;
  tzId?: string;          // IANA id, for display
}

function parseOptionalFloat(value?: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Zero-pad to 2 digits */
function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Build an ISO date string from structured month/day/year. Validates range. */
function buildDateString(month: number, day: number, year: number): string {
  // Month 1-12, day 1-last day of month
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Invalid date: ${day} ${month} ${year}`);
  }
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/**
 * Convert local birth time to UTC.
 *
 * BUG C fix: if no timezone is known, we MUST NOT silently treat local time as UTC.
 * That produces a wrong Sun sign for anyone born near midnight in a non-UTC timezone.
 * If tzOffsetMin is absent, the caller must either:
 *   a) provide a birth place and resolve the timezone first, or
 *   b) accept that Ascendant/MC/houses cannot be computed (date-only precision).
 * We throw here so the calling code cannot accidentally proceed.
 */
function localTimeToUTC(
  year: number, month: number, day: number,
  hour: number, minute: number,
  tzOffsetMin: number,
): string {
  const localMs = Date.UTC(year, month - 1, day, hour, minute, 0);
  const utcMs   = localMs - tzOffsetMin * 60_000;
  return new Date(utcMs).toISOString();
}

/** Human-readable date summary shown back to the user for confirmation. */
export function formatDateForConfirmation(
  month: number, day: number, year: number,
): string {
  const MONTHS = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

export function buildBirthInput(input: BirthFormInput): {
  birth: Birth;
  birthDate: string;
  birthTime: string | null;
  birthPlace: string | null;
  tzOffsetMin: number | null;
  hadTimezone: boolean;
  /** Human-readable date for UI confirmation */
  displayDate: string;
} {
  const normalizedPlace = input.birthPlace?.trim() ? input.birthPlace.trim() : null;

  if (input.precision === "year") {
    const year = input.yearOnly ?? 0;
    if (!Number.isInteger(year) || year < 1800 || year > new Date().getFullYear() + 1) {
      throw new Error("Enter a valid birth year (1800 – present).");
    }
    return {
      birth: {
        dateUTC: `${year}-01-01T00:00:00.000Z`,
        precision: "year",
        lat: parseOptionalFloat(input.lat),
        lng: parseOptionalFloat(input.lng),
      },
      birthDate:   `${year}-01-01`,
      birthTime:   null,
      birthPlace:  normalizedPlace,
      tzOffsetMin: null,
      hadTimezone: false,
      displayDate: String(year),
    };
  }

  // date or exact precision — require structured month/day/year
  const { month, day, year } = input;
  if (!month || !day || !year) {
    throw new Error("Select a month, day, and year.");
  }
  if (year < 1800 || year > new Date().getFullYear() + 1) {
    throw new Error("Year must be between 1800 and the present.");
  }

  const dateStr    = buildDateString(month, day, year);
  const displayDate = formatDateForConfirmation(month, day, year);

  if (input.precision === "date") {
    return {
      birth: {
        dateUTC: `${dateStr}T12:00:00.000Z`,
        precision: "date",
        lat: parseOptionalFloat(input.lat),
        lng: parseOptionalFloat(input.lng),
      },
      birthDate:   dateStr,
      birthTime:   null,
      birthPlace:  normalizedPlace,
      tzOffsetMin: null,
      hadTimezone: false,
      displayDate,
    };
  }

  // exact precision — require hour, minute, and timezone
  const { hour, minute } = input;
  if (hour === undefined || minute === undefined) {
    throw new Error("Select a birth hour and minute.");
  }
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error("Invalid birth time.");
  }

  // BUG C: if no timezone, refuse to compute UTC — do not silently treat local as UTC
  if (input.tzOffsetMin === undefined || input.tzOffsetMin === null) {
    throw new Error(
      "A birth place with a resolved timezone is required for exact precision. " +
      "Without it, birth time cannot be converted to UTC and the chart will be wrong."
    );
  }

  const dateUTC = localTimeToUTC(year, month, day, hour, minute, input.tzOffsetMin);
  const timeStr = `${pad2(hour)}:${pad2(minute)}:00`;

  return {
    birth: {
      dateUTC,
      precision:   "exact",
      lat:         parseOptionalFloat(input.lat),
      lng:         parseOptionalFloat(input.lng),
      tzOffsetMin: input.tzOffsetMin,
    },
    birthDate:   dateStr,
    birthTime:   timeStr,
    birthPlace:  normalizedPlace,
    tzOffsetMin: input.tzOffsetMin,
    hadTimezone: true,
    displayDate,
  };
}
