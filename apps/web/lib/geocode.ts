/**
 * Geocode a city name to lat/lng using Nominatim (keyless, free).
 * Returns null on any failure — callers must handle gracefully.
 */
export interface GeoResult {
  lat: number;
  lng: number;
  displayName: string;
  tzOffset: number; // UTC offset in minutes derived from timezone string
  tzId: string;     // IANA timezone id (e.g. "America/New_York")
}

// tz-lookup gives us an IANA tz id from lat/lng
// We then derive the UTC offset for the given date using Intl API
async function tzOffsetMinutesForDate(tzId: string, dateUTC: Date): Promise<number> {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tzId,
      timeZoneName: "shortOffset",
      hour: "numeric"
    });
    const parts = formatter.formatToParts(dateUTC);
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

export async function geocodeCity(city: string, birthDate?: Date): Promise<GeoResult | null> {
  if (!city.trim()) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(city)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Galaxia/1.0 (hello@galaxia.app)" }
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    const first = data[0];
    if (!first) return null;

    const lat = parseFloat(first.lat);
    const lng = parseFloat(first.lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

    // Dynamic import so tz-lookup doesn't break SSR
    const { default: tzlookup } = await import("tz-lookup");
    const tzId = tzlookup(lat, lng);
    const tzOffset = await tzOffsetMinutesForDate(tzId, birthDate ?? new Date());

    return { lat, lng, displayName: first.display_name, tzId, tzOffset };
  } catch {
    return null;
  }
}
