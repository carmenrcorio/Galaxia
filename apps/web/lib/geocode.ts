/**
 * Geocoding via Open-Meteo geocoding API (keyless, structured, generous rate limits).
 * https://geocoding-api.open-meteo.com/v1/search
 *
 * Returns multiple candidates so the UI can present a disambiguation list.
 * Never silently accepts the first result.
 *
 * BUG B fix: Nominatim limit=1 was silently returning Jacksonville, FL for "Jacksonville"
 * when the user meant Jacksonville, AR. Open-Meteo returns structured admin1 (state/region)
 * and country fields, making disambiguation unambiguous.
 */

export interface GeoCandidate {
  /** Full unambiguous label shown to the user: "Jacksonville, Arkansas, United States" */
  label: string;
  lat: number;
  lng: number;
  /** IANA timezone id, e.g. "America/Chicago" */
  tzId: string;
  /** UTC offset in minutes at the given birth date */
  tzOffset: number;
  /** Admin region (state/province) if available */
  admin1?: string;
  country?: string;
}

/** Kept for backward compatibility where a resolved single result is stored */
export interface GeoResult {
  lat: number;
  lng: number;
  displayName: string;
  tzOffset: number;
  tzId: string;
}

/** Derive UTC offset in minutes for a given IANA timezone and date. */
export async function tzOffsetMinutesForDate(tzId: string, date: Date): Promise<number> {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tzId,
      timeZoneName: "shortOffset",
      hour: "numeric",
    });
    const parts = formatter.formatToParts(date);
    const tzPart = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+0";
    const match = tzPart.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    if (!match) return 0;
    const sign = match[1] === "+" ? 1 : -1;
    const hours = parseInt(match[2] ?? "0", 10);
    const mins  = parseInt(match[3] ?? "0", 10);
    return sign * (hours * 60 + mins);
  } catch {
    return 0;
  }
}

/**
 * Search Open-Meteo for up to 5 matching places.
 * Returns an empty array on failure (never throws).
 *
 * @param query     Place name, optionally with state/country e.g. "Jacksonville, Arkansas"
 * @param birthDate Used to derive the historical UTC offset (DST-aware)
 */
export async function searchPlaces(
  query: string,
  birthDate?: Date,
): Promise<GeoCandidate[]> {
  if (!query.trim()) return [];
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=5&language=en&format=json`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const json = (await res.json()) as {
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

    if (!json.results?.length) return [];

    const refDate = birthDate ?? new Date();

    // Build candidates in parallel
    const candidates = await Promise.all(
      json.results.map(async (r) => {
        const tzId = r.timezone;
        const tzOffset = await tzOffsetMinutesForDate(tzId, refDate);

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
      }),
    );

    return candidates;
  } catch {
    return [];
  }
}

/**
 * Convenience wrapper: geocode a single city string (used in backfill / edit panel).
 * Takes the first result; callers that need disambiguation should use searchPlaces instead.
 */
export async function geocodeCity(
  city: string,
  birthDate?: Date,
): Promise<GeoResult | null> {
  const candidates = await searchPlaces(city, birthDate);
  const first = candidates[0];
  if (!first) return null;
  return {
    lat: first.lat,
    lng: first.lng,
    displayName: first.label,
    tzOffset: first.tzOffset,
    tzId: first.tzId,
  };
}
