import type { HouseSystem, NatalChart } from "@galaxia/astro";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Chart engine version. Bump when computed output changes so stored charts
 * recompute on next load.
 *
 * v1 — original engine. Cusps were Equal House but stored/labeled "placidus".
 * v2 — real Placidus cusps (iterative), corrected MC formula, obliquity of
 *      date, honest year-precision sign confidence. `house_system` on the
 *      charts row is now always the system actually computed.
 */
export const CHART_ENGINE_VERSION = 2;

export const HOUSE_SYSTEM_LABEL: Record<HouseSystem, string> = {
  placidus: "Placidus",
  whole: "Whole Sign",
  equal: "Equal House"
};

export const HOUSE_SYSTEM_OPTIONS: Array<{ value: HouseSystem; label: string; description: string }> = [
  { value: "placidus", label: "Placidus", description: "The default on astro.com and Cafe Astrology — time-based division, uneven house sizes." },
  { value: "whole", label: "Whole Sign", description: "The oldest system — each house is one full sign, starting from the rising sign." },
  { value: "equal", label: "Equal House", description: "Twelve equal 30° houses measured from the exact Ascendant degree." }
];

export function isHouseSystem(value: unknown): value is HouseSystem {
  return value === "placidus" || value === "whole" || value === "equal";
}

/**
 * The user's stored house-system preference. Defaults to Placidus — the same
 * default as the reference sites users cross-check against.
 */
export async function getPreferredHouseSystem(
  supabase: SupabaseClient,
  userId: string
): Promise<HouseSystem> {
  const { data } = await supabase.from("profiles").select("house_system").eq("id", userId).maybeSingle();
  const value = (data as { house_system?: string } | null)?.house_system;
  return isHouseSystem(value) ? value : "placidus";
}

/**
 * The label shown next to the wheel and the houses section. Derived from what
 * the chart data says was actually computed — never hardcoded.
 * Legacy charts (engine v1) stored "placidus" while computing Equal House
 * cusps; when such a chart cannot be recomputed we call it what it is.
 */
export function houseSystemLabelForChart(chart: NatalChart, engineVersion: number): string {
  if (engineVersion < 2 && (chart.houseSystem === "placidus" || chart.houseSystem === undefined)) {
    return HOUSE_SYSTEM_LABEL.equal;
  }
  return chart.houseSystem ? HOUSE_SYSTEM_LABEL[chart.houseSystem] : HOUSE_SYSTEM_LABEL.equal;
}
