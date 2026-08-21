export {
  hasAccess,
  profileAllowsAccess,
  trialDaysRemaining,
  VELA_ENTITLEMENT_REQUIRED_ERROR,
  type Entitlement,
  type ProfileEntitlementRow,
  type SubscriptionStatus
} from "./has-access";

export type RelationshipType =
  | "partner"
  | "child"
  | "grandchild"
  | "parent"
  | "grandparent"
  | "sibling"
  | "friend"
  | "cousin"
  | "relative"
  | "aunt"
  | "uncle"
  | "niece"
  | "nephew"
  | "in-law"
  | "ex"
  | "colleague"
  | "boss"
  | "professor"
  | "mentor"
  | "acquaintance"
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

export * from "./star-color";

export * from "./memorial-constellations";

export * from "./galaxy-seat";

export * from "./person-care";

export * from "./honor-constellation";

export * from "./remembrance";

export * from "./record";

export * from "./owned-delete";

export * from "./cohort-reading";

export * from "./account-name";

export * from "./timezone";
