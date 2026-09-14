import { timingSafeEqual } from "node:crypto";

/**
 * Constant-time check of `Authorization: Bearer ${CRON_SECRET}` for the
 * Node-runtime cron routes. Security-critical: this is the only gate that
 * lets a scheduled job (GitHub Actions or a Vercel Cron) run those handlers.
 *
 * `timingSafeEqual` throws on unequal lengths, and an early `length !==`
 * return would reintroduce the timing signal this exists to close. Always
 * compare two buffers of `expected.length`, then mix the length check into
 * the result with a bitwise AND so neither mismatch path returns early.
 *
 * Fails closed: a missing header or empty secret never authorizes. The
 * supplied header is never logged.
 */
export function cronBearerMatches(
  authorizationHeader: string | null | undefined,
  secret: string
): boolean {
  // Config error, not attacker-controlled: never authorize an empty secret.
  if (!secret) return false;

  const expected = Buffer.from(`Bearer ${secret}`, "utf8");
  const provided = Buffer.from(authorizationHeader ?? "", "utf8");

  const scratch = Buffer.alloc(expected.length);
  provided.copy(scratch, 0, 0, Math.min(provided.length, expected.length));

  const bytesEqual = timingSafeEqual(scratch, expected) ? 1 : 0;
  const lengthEqual = provided.length === expected.length ? 1 : 0;
  return (bytesEqual & lengthEqual) === 1;
}
