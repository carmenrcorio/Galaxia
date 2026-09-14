import type { PinThemeId } from "@galaxia/core";

/**
 * User-facing copy for pinned Vela insights. Every string is FOUNDER-REVIEW.
 */

// FOUNDER-REVIEW: authored. Curated pin theme labels (what the insight is about).
export const PIN_THEME_LABELS: Record<PinThemeId, string> = {
  how_theyre_built: "How they're built",
  how_you_two_work: "How you two work",
  this_season: "This season",
  talking: "Talking",
  tension: "Tension",
  care: "Care",
  family: "Family",
  work: "Work"
};

// FOUNDER-REVIEW: authored. Search field for this person's pinned Vela insights.
export const VELA_PIN_SEARCH_PLACEHOLDER = "Search pinned insights";

// FOUNDER-REVIEW: authored. Accessible name for the pin search field.
export const VELA_PIN_SEARCH_LABEL = "Search pinned insights";

// FOUNDER-REVIEW: authored. Sort control group.
export const VELA_PIN_SORT_LABEL = "Sort pinned insights";

// FOUNDER-REVIEW: authored. Newest first.
export const VELA_PIN_SORT_NEWEST = "Newest";

// FOUNDER-REVIEW: authored. Oldest first.
export const VELA_PIN_SORT_OLDEST = "Oldest";

// FOUNDER-REVIEW: authored. Expand beyond the latest five.
export function velaPinSeeAllLabel(count: number): string {
  return `See all ${count}`;
}

// FOUNDER-REVIEW: authored. Collapse back to the latest five.
export const VELA_PIN_SHOW_LATEST = "Show the latest 5";

// FOUNDER-REVIEW: authored. Empty search result inside the pin list.
export const VELA_PIN_SEARCH_EMPTY = "No pinned insights match this search.";

// FOUNDER-REVIEW: authored. Theme picker group on a pin.
export const VELA_PIN_THEME_LABEL = "Theme";

// FOUNDER-REVIEW: authored. Clear the theme on a pin.
export const VELA_PIN_NO_THEME = "No theme";

// FOUNDER-REVIEW: authored. Heading for pins with no theme.
export const VELA_PIN_THEME_GROUP_UNTHEMED = "No theme";

// FOUNDER-REVIEW: authored. Quiet note that the selected theme came from the list matcher.
export const VELA_PIN_THEME_SUGGESTED = "Suggested from the insight. Keep it, change it, or clear it.";
