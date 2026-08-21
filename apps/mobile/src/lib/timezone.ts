import { shouldBackfillTimezone, validateIanaTimezone } from "@galaxia/core";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The device's current IANA timezone (e.g. "America/New_York"), or null if
 * `Intl` can't resolve one or resolves to something it wouldn't also accept
 * back as a `timeZone` option. See `@galaxia/core` `validateIanaTimezone`.
 * Hermes (RN's JS engine) ships full ICU/`Intl` support, so this behaves the
 * same as the web implementation.
 */
export function resolveDeviceTimezone(): string | null {
  if (typeof Intl === "undefined" || typeof Intl.DateTimeFormat !== "function") return null;
  try {
    return validateIanaTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    return null;
  }
}

/**
 * Writes the device's IANA timezone to the caller's own `profiles` row —
 * ONLY when `storedTimezone` is null/empty (see `@galaxia/core`
 * `shouldBackfillTimezone`). Never overwrites an existing value: a changed
 * tz for a traveling user is a Phase B/future concern, not this
 * prerequisite. Own-row session client only — RLS plus the `authenticated`
 * column grant (`20260726010000_profiles_timezone_capture.sql`) are what
 * actually enforce "own row only"; this guard exists to avoid a write on
 * every load once a value is already stored.
 */
export async function backfillProfileTimezoneIfMissing(
  supabase: SupabaseClient,
  userId: string,
  storedTimezone: string | null | undefined
): Promise<void> {
  if (!shouldBackfillTimezone(storedTimezone)) return;
  const timezone = resolveDeviceTimezone();
  if (!timezone) return;
  await supabase.from("profiles").update({ timezone }).eq("id", userId);
}
