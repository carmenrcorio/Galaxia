import { isHouseSystem, type HouseSystem } from "@galaxia/astro";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The user's stored house-system preference, read from `profiles.house_system`.
 *
 * Mobile used to pass a hardcoded "placidus" into computeNatalChart, so a chart
 * saved from the phone ignored a preference the same user had already set in
 * web Settings. Mirrors apps/web/lib/house-system.ts: Placidus is only the
 * fallback for a profile with no stored preference, never an override of one.
 *
 * The preference itself is set in web Settings; mobile has no picker yet.
 * Constants / labels / CHART_ENGINE_VERSION live in `@galaxia/astro`.
 */
export async function getPreferredHouseSystem(
  supabase: SupabaseClient,
  userId: string
): Promise<HouseSystem> {
  const { data } = await supabase.from("profiles").select("house_system").eq("id", userId).maybeSingle();
  const value = (data as { house_system?: string } | null)?.house_system;
  return isHouseSystem(value) ? value : "placidus";
}
