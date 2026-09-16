/**
 * COPPA age attestation for account creation.
 *
 * The checkbox on the signup form is client-side UX only. This module is the
 * server-side guard: signup must send `age_confirmed: true` on the request
 * body. There is no birth-date column and no persistence of the flag.
 */

export const AGE_CONFIRMATION_REQUIRED = "Age confirmation required";

export function hasAgeConfirmation(body: unknown): boolean {
  if (body === null || typeof body !== "object") return false;
  return (body as { age_confirmed?: unknown }).age_confirmed === true;
}
