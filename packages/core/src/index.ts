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
