/**
 * Generations Feature 1 — Memorial Timeline shared constants + gates.
 *
 * Astrology computation lives in @galaxia/astro (computeLifespanTransits);
 * this file only holds the "should this render at all" gate, the
 * owner-authored milestone validation (mirrors the DB check constraints in
 * 20260909020000_memorial_milestones.sql), and the lifespan-window
 * derivation. Shared between apps/web and (when built) apps/mobile.
 */

import { hasPassed } from "./galaxy-orbit";

export const MEMORIAL_MILESTONE_TITLE_MAX = 100;
export const MEMORIAL_MILESTONE_NOTE_MAX = 500;

export type MemorialMilestoneValidation =
  | { ok: true; title: string; note: string | null }
  | { ok: false; error: string };

/** Validates + trims an owner-authored milestone before insert/update. */
export function validateMemorialMilestoneInput(input: {
  title: string;
  note?: string | null;
  date: string | null | undefined;
}): MemorialMilestoneValidation {
  const title = input.title.trim();
  const note = input.note?.trim() ?? "";
  if (!input.date) return { ok: false, error: "A date is required." };
  if (!title) return { ok: false, error: "A title is required." };
  if (title.length > MEMORIAL_MILESTONE_TITLE_MAX) {
    return { ok: false, error: `Keep the title to ${MEMORIAL_MILESTONE_TITLE_MAX} characters or fewer.` };
  }
  if (note.length > MEMORIAL_MILESTONE_NOTE_MAX) {
    return { ok: false, error: `Keep the note to ${MEMORIAL_MILESTONE_NOTE_MAX} characters or fewer.` };
  }
  return { ok: true, title, note: note.length ? note : null };
}

/**
 * The Timeline only ever appears on a passed, non-self profile whose chart
 * carries real (non-year-only) natal longitudes — a year-only chart's
 * placements are sampled mid-year, so a "Saturn return" computed against
 * them would be a fabricated date (ENGINEERING.md §12), exactly like the
 * existing "Active today" gate (shouldShowLiveTransits, person-care.ts) is
 * the mirror-image gate for living people.
 */
export function shouldShowMemorialTimeline(
  person: { passed_at?: string | null; is_self?: boolean } | null | undefined,
  chart: { precision?: string } | null | undefined
): boolean {
  if (!person || person.is_self) return false;
  if (!hasPassed(person)) return false;
  if (!chart || chart.precision === "year") return false;
  return true;
}

/**
 * The end of the lifespan-transit search window. When the owner has recorded
 * a real date of death (`died_on` — distinct from `passed_at`, see
 * 20260909020000_memorial_milestones.sql), that is the honest end date.
 * Otherwise the window is honestly bounded at "today" — never a fabricated
 * end date — and the caller should hedge that the passing date is unrecorded.
 */
export function memorialTimelineWindow(
  person: { died_on?: string | null },
  now: Date = new Date()
): { endDateUTC: string; endIsKnown: boolean } {
  if (person.died_on) {
    return { endDateUTC: `${person.died_on.slice(0, 10)}T12:00:00.000Z`, endIsKnown: true };
  }
  return { endDateUTC: now.toISOString(), endIsKnown: false };
}
