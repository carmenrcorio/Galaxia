/**
 * Display-only casing for a stored relationship label.
 * Stored values stay as entered. Call this at render time.
 */
export function formatRelationshipLabel(label: string): string {
  return label.toLowerCase();
}
