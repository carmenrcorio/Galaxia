/**
 * Minor safety — the single source of truth for "is this person a minor for
 * safety purposes" (ENGINEERING.md §9: "No two-way AI chat with a minor").
 *
 * An audit found a real child in production with `is_minor = false`: the
 * manual checkbox is a human-set flag that can be forgotten, silently reset
 * between saves (`/welcome` clears it after every successful add), or
 * entirely absent from an insert path (Quick Check, Quick Chart's save
 * button hardcoded `false` with no control at all). It must never be the
 * ONLY signal a safety gate relies on.
 *
 * Every safety gate must call `isMinorForSafety`, never read `is_minor`
 * directly. It ORs the manual flag with an age computed from birth_date:
 *
 *   effective minor = is_minor === true  OR  minPossibleAge(birthDate) < 18
 *
 * The manual flag can only ADD protection, never remove it — there is no
 * path where a computed-minor person is treated as an adult because the
 * checkbox says false. Per the safety principle "when uncertain,
 * over-protect": a false positive (adult flagged minor) is a minor
 * inconvenience; a false negative (child not flagged) is a safety failure.
 *
 * Edge functions run on Deno and cannot import this workspace package — the
 * identical algorithm is mirrored in supabase/functions/vela-chat/index.ts
 * with a comment pointing back here. Keep both in sync.
 */
export interface MinorSafetyInput {
  isMinor?: boolean | null;
  /** "YYYY-MM-DD". Year-only precision stores this as "YYYY-01-01" — pass birthPrecision so that's interpreted correctly. */
  birthDate?: string | null;
  birthPrecision?: "none" | "exact" | "date" | "year" | null;
}

/**
 * The YOUNGEST age this person could possibly be right now, given what we
 * actually know about their birth date. Returns null when there is nothing
 * to compute from (no birth date, or progressive-capture "none" precision) —
 * callers must never treat null as "confirmed adult."
 *
 * Year-only precision is inherently ambiguous (the real birthday could be
 * any day in that year). Over-protect on that ambiguity by assuming the
 * latest possible birthday (Dec 31) — the interpretation that yields the
 * smallest current age, so a person who could be 17 or 18 is treated as 17.
 */
export function minPossibleAge(
  birthDate: string | null | undefined,
  birthPrecision: MinorSafetyInput["birthPrecision"],
  now: Date = new Date()
): number | null {
  if (!birthDate || !birthPrecision || birthPrecision === "none") return null;
  const [year, storedMonth, storedDay] = birthDate.slice(0, 10).split("-").map(Number);
  if (!Number.isFinite(year)) return null;

  const [month, day] = birthPrecision === "year" ? [12, 31] : [storedMonth, storedDay];
  if (!Number.isFinite(month) || !Number.isFinite(day)) return null;

  let age = now.getUTCFullYear() - year;
  const beforeBirthdayThisYear =
    now.getUTCMonth() + 1 < month || (now.getUTCMonth() + 1 === month && now.getUTCDate() < day);
  if (beforeBirthdayThisYear) age -= 1;
  return age;
}

/** effective minor = is_minor === true OR computed age < 18. See doc comment above. */
export function isMinorForSafety(person: MinorSafetyInput, now: Date = new Date()): boolean {
  if (person.isMinor === true) return true;
  const age = minPossibleAge(person.birthDate, person.birthPrecision, now);
  return age !== null && age < 18;
}

