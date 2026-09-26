/** Display labels for engine body keys. `north_node` is a point, not a planet. */
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
  north_node: "North Node"
};

/** Title-case label for a body or chart point (`north_node` → `North Node`). */
export function bodyDisplayName(body: string): string {
  const key = body.toLowerCase();
  return BODY_DISPLAY_NAME[key] ?? (body.charAt(0).toUpperCase() + body.slice(1).replace(/_/g, " "));
}

export function isChartPoint(body: string): boolean {
  return body.toLowerCase() === "north_node";
}
