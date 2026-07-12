import type { HouseSystem } from "@galaxia/astro";
import { isHouseSystem } from "@galaxia/astro";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The user's stored house-system preference. Defaults to Placidus — the same
 * default as the reference sites users cross-check against.
 *
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
