/**
 * Subscription / entitlement model (card-optional 14-day trial).
 * The single source of truth for "can this user use the product right now".
 * Shared by apps/web middleware and apps/mobile so access is decided one way,
 * everywhere. Replaces the old free/plus `subscription_tier` and the mobile
 * debug tier switch that let a user grant themselves a paid plan
 * (ENGINEERING.md §7 revenue bug).
 */
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "lifetime";

export interface Entitlement {
  status?: SubscriptionStatus | string | null;
  /** ISO string or Date; the trial's end for `trialing` status. */
  trialEndsAt?: string | Date | null;
}

/**
 * hasAccess = active || lifetime || (trialing && trial_ends_at > now)
 * Missing/unknown status is treated as trialing (a just-created account whose
 * profile row/trigger is still settling); a trialing status with no end date
 * has no access under the strict rule. Callers that cannot load a profile at
 * all should decide their own fail-open/closed posture.
 */
export function hasAccess(entitlement: Entitlement | null | undefined, now: Date = new Date()): boolean {
  const status = entitlement?.status ?? "trialing";
  if (status === "active" || status === "lifetime") return true;
  if (status === "trialing") {
    const raw = entitlement?.trialEndsAt;
    if (!raw) return false;
    const end = raw instanceof Date ? raw : new Date(raw);
    return !Number.isNaN(end.getTime()) && end.getTime() > now.getTime();
  }
  return false; // past_due, canceled
}

/** Whole days remaining in a trial (0 if ended/unknown). For the calm trial banner. */
export function trialDaysRemaining(trialEndsAt: string | Date | null | undefined, now: Date = new Date()): number {
  if (!trialEndsAt) return 0;
  const end = trialEndsAt instanceof Date ? trialEndsAt : new Date(trialEndsAt);
  if (Number.isNaN(end.getTime())) return 0;
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86_400_000));
}

export type RelationshipType =
  | "partner"
  | "child"
  | "parent"
  | "grandparent"
  | "sibling"
  | "friend"
  | "ancestor"
  | "self";

export const GENERATIONAL_ARCHETYPES: Record<string, string> = {
  "Pluto in Scorpio":
    "This cohort often treats trust and loyalty as all-or-nothing, with deep instincts around emotional honesty.",
  "Pluto in Sagittarius":
    "This cohort tends to seek freedom through truth, exploration, and redefining inherited beliefs.",
  "Pluto in Capricorn":
    "This cohort is often oriented toward rebuilding systems, responsibility, and long-range resilience.",
  "Neptune in Capricorn":
    "A generation learning to translate ideals into structure, often skeptical of vague promises.",
  "Neptune in Aquarius":
    "A generation shaped by networked imagination, collective ideals, and digital belonging.",
  "Uranus in Sagittarius":
    "This cohort often pushes for expansion through movement, learning, and worldview disruption.",
  "Uranus in Aquarius":
    "This cohort tends to innovate through community systems, technology, and social experimentation."
};

export function describeGenerationalArchetype(planet: "Pluto" | "Neptune" | "Uranus", sign: string): string {
  return GENERATIONAL_ARCHETYPES[`${planet} in ${sign}`] ?? "This placement points to the era-level values that shaped someone's worldview.";
}

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
