import { computeTransits, type NatalChart, type TransitHit } from "@galaxia/astro";

/**
 * Today's real transits for ONE natal chart.
 *
 * Deterministic: real ephemeris positions for the transiting bodies (at
 * `whenUTC`) aspected against THIS chart's own stored natal longitudes. The
 * result is therefore specific to the person whose chart is passed in — two
 * different charts can only yield the same transit + orb when the aspect is
 * genuinely, computationally true for both.
 *
 * Year-only charts are excluded on purpose (ENGINEERING §12 — never fabricate):
 * their natal longitudes are sampled at mid-year, so a "0.4° orb" computed
 * against them would be a confident-looking guess, not a fact. Exact/date charts
 * carry real longitudes, so their transits are honest.
 *
 * This is the single source of truth used by both the person page ("Active
 * today") and the home dashboard ("Today in your sky"), so the two surfaces can
 * never disagree about a person's active transits.
 */
export function todayTransitsForChart(
  chart: NatalChart | null | undefined,
  whenUTC: string = new Date().toISOString(),
  limit = 3
): TransitHit[] {
  if (!chart || chart.precision === "year") return [];
  return computeTransits(chart, whenUTC)
    .filter((hit) => hit.orb <= 1.5)
    .slice(0, limit);
}

/**
 * Human phrasing for a transit hit, matching the person page copy
 * ("transiting Mars square their natal Venus"). `possessive` lets the home
 * dashboard say "your" for the signed-in person and "their" for everyone else.
 */
export function describeTransit(hit: TransitHit, possessive: "your" | "their" = "their"): string {
  return `transiting ${hit.transitBody} ${hit.type} ${possessive} natal ${hit.natalBody}`;
}
