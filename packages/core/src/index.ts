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
  | "colleague"
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

export * from "./minor-safety";

export * from "./galaxy-orbit";

export * from "./person-care";

export * from "./honor-constellation";
