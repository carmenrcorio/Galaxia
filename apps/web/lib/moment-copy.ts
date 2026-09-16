import type { MomentTypeId } from "@galaxia/core";
import { MOMENT_TYPE_LABELS } from "@galaxia/core";

/**
 * User-facing copy for The Moment.
 */

export { MOMENT_TYPE_LABELS };

export const MOMENT_TYPE_CHIP_LABELS: Record<MomentTypeId, string> = MOMENT_TYPE_LABELS;

export const CAPTURE_MOMENT = "Capture a moment";

export const MOMENT_EYEBROW = "The Moment";

export const MOMENT_PAGE_TITLE = "Sixty seconds";

export const MOMENT_DEK =
  "Person, what it was, two sentences if you want. The sky between you is attached automatically.";

export const MOMENT_PERSON_LABEL = "Who is this about?";

export const MOMENT_TYPE_LABEL = "What kind of moment?";

export const MOMENT_NOTE_LABEL = "What happened (optional)";

export const MOMENT_NOTE_PLACEHOLDER = "Two sentences is enough.";

export const MOMENT_SAVE = "Save this moment";

export const MOMENT_SAVING = "Saving…";

export const MOMENT_SKY_ATTACHED =
  "The current sky between you is attached. You never enter astrology data.";

export const MOMENT_REFLECTION_HEADING = "Vela's reflection";

export const MOMENT_PIN = "Pin this reflection";

export const MOMENT_SKIP = "Skip";

export const MOMENT_PINNED = "Pinned to their record";

export const MOMENT_PINNED_SELF = "Pinned to your record";

export const MOMENT_OPEN_RECORD = "Open their record";

export const MOMENT_OPEN_RECORD_SELF = "Open your record";

export const MOMENT_NO_PEOPLE =
  "Add someone to your constellation before you can save a moment about them.";
export const MOMENT_NO_PEOPLE_ACTION = "Add someone";
export const MOMENT_LOADING = "Loading the people you can save a moment about.";
export const MOMENT_LOAD_ERROR = "The people for this moment could not load. Try again.";
export const MOMENT_RETRY = "Try again";
export const MOMENT_PIN_FAILED = "This reflection could not be pinned. Try again.";
export const MOMENT_SAVE_FAILED = "Could not save this moment.";

export const MOMENT_RECORD_KIND = "Moment";

export const MOMENT_SKY_UNREADABLE =
  "The stored sky for this moment could not be read.";
