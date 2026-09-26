import { buildBirthInput, type BirthFormInput } from "@galaxia/astro";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

// FOUNDER-REVIEW: anonymous Quick Chart capture responses.
export const CHART_LEAD_CONFIRMATION = "You are in. We will reach out when something moves.";
export const CHART_LEAD_INVALID_EMAIL = "Enter a valid email address.";
export const CHART_LEAD_RATE_LIMITED = "Too many requests. Try again in a minute.";

export function normalizeChartLeadEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidChartLeadEmail(value: string): boolean {
  return value.length <= MAX_EMAIL_LENGTH && EMAIL_RE.test(value);
}

function optionalInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) ? value : undefined;
}

function optionalString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : undefined;
}

/**
 * Allowlists the BirthFormInput persisted for an anonymous lead. Calling
 * buildBirthInput applies the same date/time correctness checks as Quick Chart.
 * Computed chart output and display-only names can never enter chart_data.
 */
export function parseChartLeadBirthInput(value: unknown): BirthFormInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Birth data is required.");
  }

  const raw = value as Record<string, unknown>;
  if (raw.precision !== "year" && raw.precision !== "date" && raw.precision !== "exact") {
    throw new Error("Birth data is required.");
  }

  const input: BirthFormInput = {
    precision: raw.precision,
    month: optionalInteger(raw.month),
    day: optionalInteger(raw.day),
    year: optionalInteger(raw.year),
    hour: optionalInteger(raw.hour),
    minute: optionalInteger(raw.minute),
    yearOnly: optionalInteger(raw.yearOnly),
    birthPlace: optionalString(raw.birthPlace, 300),
    lat: optionalString(raw.lat, 32),
    lng: optionalString(raw.lng, 32),
    tzOffsetMin: optionalInteger(raw.tzOffsetMin),
    tzId: optionalString(raw.tzId, 100),
  };

  if (input.tzOffsetMin !== undefined && (input.tzOffsetMin < -840 || input.tzOffsetMin > 840)) {
    throw new Error("Invalid birth timezone.");
  }
  if (input.lat !== undefined) {
    const lat = Number(input.lat);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new Error("Invalid birth latitude.");
  }
  if (input.lng !== undefined) {
    const lng = Number(input.lng);
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) throw new Error("Invalid birth longitude.");
  }

  buildBirthInput(input);
  return Object.fromEntries(
    Object.entries(input).filter(([, fieldValue]) => fieldValue !== undefined)
  ) as unknown as BirthFormInput;
}
