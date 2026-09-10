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
 * Whether the Timeline section (and the "Add a memory" flow) render at all.
 *
 * This is now a pure "does this profile qualify for remembrance" gate: the
 * person exists, is not the viewer's own self-profile, and has passed. It no
 * longer requires a chart or a particular chart precision — a year-only
 * memorial profile still has a real (if imprecise) life to hold milestones
 * for, and hiding the whole section punished exactly the people whose birth
 * data is thinnest, which is backwards. See `memorialTimelinePrecision`
 * below for the (separate) question of how honestly transits can be
 * computed against that chart — the two used to be one gate, conflating
 * "should this render" with "how precise can the astrology be."
 *
 * `chart` is still accepted (unused) so existing call sites — which pass the
 * chart as the second argument — keep working unchanged.
 *
 * Mirror-image of the "Active today" gate for living people
 * (shouldShowLiveTransits, person-care.ts).
 */
export function shouldShowMemorialTimeline(
  person: { passed_at?: string | null; is_self?: boolean } | null | undefined,
  chart?: { precision?: string } | null | undefined
): boolean {
  if (!person || person.is_self) return false;
  if (!hasPassed(person)) return false;
  return true;
}

export type MemorialTimelinePrecision = "exact" | "approximate";

/**
 * How honestly the Memorial Timeline can date the transits it computes for
 * this profile. `'approximate'` for a year-only chart — its natal longitudes
 * are sampled mid-year (never a real birth day), so a "Saturn return"
 * computed against them can only honestly be placed by estimated age, not by
 * calendar date (ENGINEERING.md §12). `'exact'` otherwise (`exact` or `date`
 * precision, or no birth data at all — there is nothing to round in that
 * case, `computeLifespanTransits` simply has no events to compute).
 *
 * Takes the person row (its `birth_precision`, the source of truth the chart
 * itself is derived from) rather than the chart, so this still resolves
 * correctly even when a chart failed to build.
 */
export function memorialTimelinePrecision(
  person: { birth_precision?: string | null } | null | undefined
): MemorialTimelinePrecision {
  return person?.birth_precision === "year" ? "approximate" : "exact";
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
