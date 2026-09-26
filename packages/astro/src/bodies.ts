/** Display labels for engine body keys. `north_node` and `chiron` are points, not planets. */
export const BODY_DISPLAY_NAME: Record<string, string> = {
  sun: "Sun",
  moon: "Moon",
  mercury: "Mercury",
  venus: "Venus",
  mars: "Mars",
  jupiter: "Jupiter",
  saturn: "Saturn",
  uranus: "Uranus",
  neptune: "Neptune",
  pluto: "Pluto",
  north_node: "North Node",
  // FOUNDER-REVIEW: Chiron card title.
  chiron: "Chiron"
};

/** Title-case label for a body or chart point (`north_node` → `North Node`). */
export function bodyDisplayName(body: string): string {
  const key = body.toLowerCase();
  return BODY_DISPLAY_NAME[key] ?? (body.charAt(0).toUpperCase() + body.slice(1).replace(/_/g, " "));
}

export function isChartPoint(body: string): boolean {
  const key = body.toLowerCase();
  return key === "north_node" || key === "chiron";
}
