/**
 * Shared Relationship Record primitives.
 * Fetch/write helpers that talk to Supabase and build web hrefs stay in apps/web.
 */

export type RecordKind =
  | "note"
  | "tending"
  | "vela_pin"
  | "compare_reading"
  | "cohort_reading"
  | "remembrance"
  | "chart_correction";

/** Order a pair id tuple deterministically (matches the edge function). */
export function orderPair(a: string, b: string): { pairLow: string; pairHigh: string } {
  return a < b ? { pairLow: a, pairHigh: b } : { pairLow: b, pairHigh: a };
}
