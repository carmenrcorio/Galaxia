import type { MomentTypeId } from "@galaxia/core";
import { MOMENT_TYPE_LABELS } from "@galaxia/core";

/**
 * User-facing copy for The Moment. Every string is FOUNDER-REVIEW.
 */

export { MOMENT_TYPE_LABELS };

export const MOMENT_TYPE_CHIP_LABELS: Record<MomentTypeId, string> = MOMENT_TYPE_LABELS;

// FOUNDER-REVIEW: authored. Home and person-profile entry.
export const CAPTURE_MOMENT = "Capture a moment";

// FOUNDER-REVIEW: authored. Flow page eyebrow.
export const MOMENT_EYEBROW = "The Moment";

// FOUNDER-REVIEW: authored. Flow page title.
export const MOMENT_PAGE_TITLE = "Sixty seconds";

// FOUNDER-REVIEW: authored. Flow dek.
export const MOMENT_DEK =
  "Person, what it was, two sentences if you want. The sky between you is attached automatically.";

// FOUNDER-REVIEW: authored. Person picker.
export const MOMENT_PERSON_LABEL = "Who is this about?";

// FOUNDER-REVIEW: authored. Type picker.
export const MOMENT_TYPE_LABEL = "What kind of moment?";

// FOUNDER-REVIEW: authored. Optional note.
export const MOMENT_NOTE_LABEL = "What happened (optional)";

// FOUNDER-REVIEW: authored. Optional note field.
export const MOMENT_NOTE_PLACEHOLDER = "Two sentences is enough.";

// FOUNDER-REVIEW: authored. Save control.
export const MOMENT_SAVE = "Save this moment";

// FOUNDER-REVIEW: authored. Saving state.
export const MOMENT_SAVING = "Saving…";

// FOUNDER-REVIEW: authored. Honesty that astrology is attached, not typed.
export const MOMENT_SKY_ATTACHED =
  "The current sky between you is attached. You never enter astrology data.";

// FOUNDER-REVIEW: authored. Reflection heading after save.
export const MOMENT_REFLECTION_HEADING = "Vela's reflection";

// FOUNDER-REVIEW: authored. Pin the reflection using existing vela_pin.
export const MOMENT_PIN = "Pin this reflection";

// FOUNDER-REVIEW: authored. Skip pinning.
export const MOMENT_SKIP = "Skip";

// FOUNDER-REVIEW: authored. After pin.
export const MOMENT_PINNED = "Pinned to their record";

// FOUNDER-REVIEW: authored. After pin, self.
export const MOMENT_PINNED_SELF = "Pinned to your record";

// FOUNDER-REVIEW: authored. Open the person Record.
export const MOMENT_OPEN_RECORD = "Open their record";

// FOUNDER-REVIEW: authored. Open self Record.
export const MOMENT_OPEN_RECORD_SELF = "Open your record";

// FOUNDER-REVIEW: authored. Empty constellation.
export const MOMENT_NO_PEOPLE =
  "Add someone to your constellation before you can save a moment about them.";

// FOUNDER-REVIEW: authored. Record kind label.
export const MOMENT_RECORD_KIND = "Moment";

// FOUNDER-REVIEW: authored. Stored snapshot missing or unreadable.
export const MOMENT_SKY_UNREADABLE =
  "The stored sky for this moment could not be read.";
