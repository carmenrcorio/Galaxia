import type { PinThemeId } from "@galaxia/core";

/**
 * User-facing copy for pinned Vela insights.
 */

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

export const VELA_PIN_SEARCH_PLACEHOLDER = "Search pinned insights";

export const VELA_PIN_SEARCH_LABEL = "Search pinned insights";

export const VELA_PIN_SORT_LABEL = "Sort pinned insights";

export const VELA_PIN_SORT_NEWEST = "Newest";

export const VELA_PIN_SORT_OLDEST = "Oldest";

export function velaPinSeeAllLabel(count: number): string {
  return `See all ${count}`;
}

export const VELA_PIN_SHOW_LATEST = "Show the latest 5";

export const VELA_PIN_SEARCH_EMPTY = "No pinned insights match this search.";

export const VELA_PIN_THEME_LABEL = "Theme";

export const VELA_PIN_NO_THEME = "No theme";

export const VELA_PIN_THEME_GROUP_UNTHEMED = "No theme";

export const VELA_PIN_THEME_SUGGESTED = "Suggested from the insight. Keep it, change it, or clear it.";
