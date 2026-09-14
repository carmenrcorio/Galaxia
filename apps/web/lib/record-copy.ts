import type { RecordTagId } from "@galaxia/core";

/**
 * User-facing Record search / tag copy. Every string is FOUNDER-REVIEW.
 */

// FOUNDER-REVIEW: authored. Curated Record tag labels (relational journal).
export const RECORD_TAG_LABELS: Record<RecordTagId, string> = {
  hard_conversation: "Hard conversation",
  breakthrough: "Breakthrough",
  conflict: "Conflict",
  celebration: "Celebration",
  pattern_noticed: "Pattern noticed",
  something_they_said: "Something they said",
  silence_needed_filling: "Silence that needed filling"
};

// FOUNDER-REVIEW: authored. Search field for the current person's Record.
export const RECORD_SEARCH_PLACEHOLDER = "Search this record";

// FOUNDER-REVIEW: authored. Accessible name for the Record search field.
export const RECORD_SEARCH_LABEL = "Search this record";

// FOUNDER-REVIEW: authored. Start of the date range filter.
export const RECORD_DATE_FROM_LABEL = "From";

// FOUNDER-REVIEW: authored. End of the date range filter.
export const RECORD_DATE_TO_LABEL = "To";

// FOUNDER-REVIEW: authored. Tag filter group label.
export const RECORD_TAG_FILTER_LABEL = "Filter by tag";

// FOUNDER-REVIEW: authored. Per-entry tag picker label.
export const RECORD_TAG_ENTRY_LABEL = "Tag this note";

// FOUNDER-REVIEW: authored. Empty filter result.
export const RECORD_FILTER_EMPTY = "No entries match these filters.";

// FOUNDER-REVIEW: authored. Reset search, dates, and tag filter.
export const RECORD_CLEAR_FILTERS = "Clear filters";
