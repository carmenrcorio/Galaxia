/**
 * Remembrance web chrome — CSS tokens and Next.js `/app/vela` navigation.
 * Domain logic lives in `@galaxia/core` (shouldShowRemembranceSpace, note
 * inserts, chart lines, etc.).
 */

/** Soft water / ancient-light chrome tokens — reuse Phase 1 palette, no new language. */
export const REMEMBRANCE_CHROME = {
  /** Galaxy water register (`--water` / EL_COLOR.water). */
  water: "#6FB1B8",
  /** Ancestor / ancient-light legend colour on the constellation. */
  ancient: "#DA8C8C",
  border: "rgba(111,177,184,.28)",
  background: "linear-gradient(120deg, rgba(111,177,184,.10), rgba(218,140,140,.05))",
  accentBorder: "2px solid rgba(111,177,184,.4)",
} as const;

/**
 * Vela entry for remembrance — navigation only. Never auto-sends a message.
 * Prefill is intentionally omitted so Vela does not speak first or nudge.
 */
export function remembranceVelaHref(personId: string): string {
  return `/app/vela?scope=person&subject=${encodeURIComponent(personId)}`;
}
