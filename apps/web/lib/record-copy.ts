import type { RecordTagId } from "@galaxia/core";

/**
 * User-facing Record search / tag copy.
 */

export const RECORD_TAG_LABELS: Record<RecordTagId, string> = {
  hard_conversation: "Hard conversation",
  breakthrough: "Breakthrough",
  conflict: "Conflict",
  celebration: "Celebration",
  pattern_noticed: "Pattern noticed",
  something_they_said: "Something they said",
  silence_needed_filling: "Silence that needed filling"
};

export const RECORD_SEARCH_PLACEHOLDER = "Search this record";

export const RECORD_SEARCH_LABEL = "Search this record";

export const RECORD_DATE_FROM_LABEL = "From";

export const RECORD_DATE_TO_LABEL = "To";

export const RECORD_TAG_FILTER_LABEL = "Filter by tag";

export const RECORD_TAG_ENTRY_LABEL = "Tag this note";

export const RECORD_FILTER_EMPTY = "No entries match these filters.";

export const RECORD_CLEAR_FILTERS = "Clear filters";
