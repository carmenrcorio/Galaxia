/**
 * Remembrance chrome tokens and Vela navigation for the mobile person page.
 * Domain logic lives in `@galaxia/core`.
 */

export const REMEMBRANCE_CHROME = {
  water: "#6FB1B8",
  ancient: "#DA8C8C",
  border: "rgba(111,177,184,0.28)",
  background: "rgba(111,177,184,0.10)",
  accentBorder: "rgba(111,177,184,0.4)"
} as const;

/** Vela entry for remembrance. Never auto-sends a message. */
export function remembranceVelaParams(personId: string): { pathname: "/vela"; params: { subject: string } } {
  return { pathname: "/vela", params: { subject: personId } };
}
