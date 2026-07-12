/**
 * Geocoding via Open-Meteo geocoding API (keyless, structured, generous rate limits).
 * https://geocoding-api.open-meteo.com/v1/search
 *
 * Returns multiple candidates so the UI can present a disambiguation list.
 * Never silently accepts the first result.
 *
 * Honesty rules enforced here:
 * - No `geocodeCity`-style "take the first hit" helper exists. Every place is
 *   chosen explicitly by the user from the candidate list (BUG B: Nominatim
 *   limit=1 silently returned Jacksonville, FL when the user meant Arkansas).
 * - A timezone offset that cannot be resolved is `null`, never a silent 0
 *   (0 would mean "treat the birth time as UTC" — a confidently wrong chart).
 * - A network failure throws; only a genuine empty result set returns [].
 *   "No places found" must never be shown for an outage.
 */

export interface GeoCandidate {
  /** Full unambiguous label shown to the user: "Jacksonville, Arkansas, United States" */
  label: string;
  lat: number;
  lng: number;
  /** IANA timezone id, e.g. "America/Chicago" */
  tzId: string;
  /** UTC offset in minutes at the given birth date, or null when it could not be resolved. */
  tzOffset: number | null;
  /** Admin region (state/province) if available */
  admin1?: string;
  country?: string;
}

/** Thrown when the geocoding service cannot be reached (distinct from "no results"). */
export class GeocodeUnavailableError extends Error {
  constructor() {
    super("The place search service couldn't be reached. Check your connection and try again.");
    this.name = "GeocodeUnavailableError";
  }
}

/**
 * Derive UTC offset in minutes for a given IANA timezone and date.
 * Returns null when the offset cannot be determined — never a fabricated 0.
 */
export function tzOffsetMinutesForDate(tzId: string, date: Date): number | null {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tzId,
      timeZoneName: "shortOffset",
      hour: "numeric",
    });
    const parts = formatter.formatToParts(date);
    const tzPart = parts.find((p) => p.type === "timeZoneName")?.value;
    if (!tzPart) return null;
    if (tzPart === "GMT") return 0; // Intl renders a true zero offset as bare "GMT"
    const match = tzPart.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    if (!match) return null;
    const sign = match[1] === "+" ? 1 : -1;
    const hours = parseInt(match[2] ?? "0", 10);
    const mins  = parseInt(match[3] ?? "0", 10);
    return sign * (hours * 60 + mins);
  } catch {
    return null;
  }
}

/**
 * Search Open-Meteo for up to 5 matching places.
 * Returns [] only when the service genuinely found nothing;
 * throws GeocodeUnavailableError when the service can't be reached.
 *
 * @param query     Place name, optionally with state/country e.g. "Jacksonville, Arkansas"
 * @param birthDate Used to derive the historical UTC offset (DST-aware)
 */
export async function searchPlaces(
  query: string,
  birthDate?: Date,
): Promise<GeoCandidate[]> {
  if (!query.trim()) return [];
  let json: {
    results?: Array<{
      id: number;
      name: string;
      latitude: number;
      longitude: number;
      timezone: string;
      admin1?: string;
      country?: string;
      country_code?: string;
    }>;
  };
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=5&language=en&format=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`geocoding ${res.status}`);
    json = await res.json();
  } catch {
    throw new GeocodeUnavailableError();
  }

  if (!json.results?.length) return [];

  const refDate = birthDate ?? new Date();

  return json.results.map((r) => {
    const tzId = r.timezone;
    const tzOffset = tzOffsetMinutesForDate(tzId, refDate);

    // Build a label the user can read unambiguously
    const parts = [r.name];
    if (r.admin1 && r.admin1 !== r.name) parts.push(r.admin1);
    if (r.country) parts.push(r.country);
    const label = parts.join(", ");

    return {
      label,
      lat: r.latitude,
      lng: r.longitude,
      tzId,
      tzOffset,
      admin1: r.admin1,
      country: r.country,
    } satisfies GeoCandidate;
  });
}
