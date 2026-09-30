import { storedPairPassesScannerGate } from "@galaxia/astro";
import { isMinorForSafety, type MinorSafetyInput } from "@galaxia/core";

export type RelationalPushSafetySkip = "minor" | "stale";

/**
 * Whether a stored This Week pair may go to the lock screen.
 * A missing person row fails closed (we cannot prove an adult).
 * Synastry uses current chart longitudes, never the stored-row placeholder.
 */
export function relationalPushSafetySkip(input: {
  people: Array<MinorSafetyInput | null | undefined>;
  longitudes: readonly [number | null, number | null];
  now?: Date;
}): RelationalPushSafetySkip | null {
  const involvesMinor = input.people.some((person) => {
    if (!person) return true;
    return isMinorForSafety(person, input.now);
  });
  if (involvesMinor) return "minor";
  if (!storedPairPassesScannerGate(input.longitudes[0], input.longitudes[1])) return "stale";
  return null;
}
