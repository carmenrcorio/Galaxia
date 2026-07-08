import type { Birth, Precision } from "@galaxia/astro";

export interface BirthFormInput {
  precision: Precision;
  date: string;
  time: string;
  year: string;
  birthPlace?: string;
  lat?: string;
  lng?: string;
}

function parseOptionalFloat(value?: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function buildBirthInput(input: BirthFormInput): { birth: Birth; birthDate: string; birthTime: string | null; birthPlace: string | null } {
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
      birthDate: `${year}-01-01`,
      birthTime: null,
      birthPlace: normalizedPlace
    };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    throw new Error("Use YYYY-MM-DD for birth date.");
  }

  if (input.precision === "exact" && !/^\d{2}:\d{2}$/.test(input.time)) {
    throw new Error("Use HH:MM (24h) for exact birth time.");
  }

  const dateUTC = input.precision === "exact" ? `${input.date}T${input.time}:00.000Z` : `${input.date}T12:00:00.000Z`;
  return {
    birth: {
      dateUTC,
      precision: input.precision,
      lat: parseOptionalFloat(input.lat),
      lng: parseOptionalFloat(input.lng)
    },
    birthDate: input.date,
    birthTime: input.precision === "exact" ? `${input.time}:00` : null,
    birthPlace: normalizedPlace
  };
}
