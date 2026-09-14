/**
 * Galaxia — first-run orientation state.
 *
 * The five-step flow that leads with the other person: choose who, give their
 * birth details, read one true statement about them, then give your own birth
 * details, then choose what happens next.
 *
 * Everything here is pure so both clients share one definition of "which step
 * is this account on" and one definition of "which relations are safe near a
 * minor". No React, no Supabase: web and mobile each own their own rendering
 * and their own writes.
 */
import { isMinorForSafety, type MinorSafetyInput } from "./minor-safety";
import type { GalaxyPickerRelation } from "./galaxy-orbit";

/* ── Steps ──────────────────────────────────────────────────────────────── */

/** The five steps, in order. Stored in profiles.onboarding_step. */
export const FIRST_RUN_STEPS = ["person", "birth", "reading", "you", "next"] as const;

export type FirstRunStep = (typeof FIRST_RUN_STEPS)[number];

/** Terminal values profiles.onboarding_step can also hold. */
export type FirstRunTerminal = "done" | "skipped";

export type FirstRunStoredStep = FirstRunStep | FirstRunTerminal;

/** The two profile columns this module reads. Nothing else is needed. */
export interface FirstRunProfileRow {
  onboarding_step?: string | null;
  onboarding_completed_at?: string | null;
}

function isFirstRunStep(value: unknown): value is FirstRunStep {
  return typeof value === "string" && (FIRST_RUN_STEPS as readonly string[]).includes(value);
}

/**
 * Has the flow stopped being offered? True once it was finished or skipped.
 *
 * `onboarding_completed_at` is the single signal, deliberately: a step value
 * alone could be stale, but a timestamp is a fact about something that
 * happened. This is what keeps the flow from ever repeating itself.
 */
export function isFirstRunSettled(profile: FirstRunProfileRow | null | undefined): boolean {
  return Boolean(profile?.onboarding_completed_at);
}

/** Finished the whole flow, as opposed to leaving it early. */
export function isFirstRunCompleted(profile: FirstRunProfileRow | null | undefined): boolean {
  return isFirstRunSettled(profile) && profile?.onboarding_step === "done";
}

/** Left the flow on purpose before the end. */
export function isFirstRunSkipped(profile: FirstRunProfileRow | null | undefined): boolean {
  return isFirstRunSettled(profile) && profile?.onboarding_step === "skipped";
}

/**
 * Where an unfinished account resumes.
 *
 * An unrecognised, missing, or terminal step degrades to the first step rather
 * than guessing at a position. Callers must check `isFirstRunSettled` first:
 * this answers "where would they resume", not "should they be sent there".
 */
export function resolveFirstRunStep(profile: FirstRunProfileRow | null | undefined): FirstRunStep {
  const stored = profile?.onboarding_step;
  return isFirstRunStep(stored) ? stored : "person";
}

/** What the account's `people` rows say, independent of any stored step. */
export interface FirstRunRecord {
  /** At least one non-self person exists. */
  hasOther: boolean;
  /** The self person exists. */
  hasSelf: boolean;
}

/**
 * Where an unfinished account actually resumes, reconciling the stored step
 * against the record.
 *
 * The record wins on anything it can settle, because a row that exists is a
 * fact while a step value is only a note we left ourselves. The stored step
 * then disambiguates the positions the record cannot distinguish, which is the
 * difference between "saw the reading and stopped" and "was about to see it".
 *
 * This is also why the `birth` step needs no special handling on resume: the
 * person row either exists (so the reader is past it) or does not (so they go
 * back to choosing, one tap, rather than to a birth form for a person nobody
 * named).
 */
export function resolveFirstRunResume(
  profile: FirstRunProfileRow | null | undefined,
  record: FirstRunRecord
): FirstRunStep {
  if (!record.hasOther) return "person";
  if (record.hasSelf) return "next";
  const stored = resolveFirstRunStep(profile);
  return stored === "you" || stored === "next" ? "you" : "reading";
}

/** True when a login with no explicit destination should open the flow. */
export function shouldEnterFirstRun(profile: FirstRunProfileRow | null | undefined): boolean {
  return !isFirstRunSettled(profile);
}

/**
 * True when the constellation should show a visible way back into the flow.
 *
 * Offered to anyone who skipped or never settled it, and withdrawn once the
 * flow was actually completed. A user who chose to skip keeps the door open;
 * they just are not pushed through it again.
 */
export function shouldOfferFirstRunRestart(profile: FirstRunProfileRow | null | undefined): boolean {
  return !isFirstRunCompleted(profile);
}

/* ── Step 1 options: who do you want to understand first? ───────────────── */

export interface FirstRunRelationOption {
  /** Stable id, used as the radio value and in tests. Not user-visible. */
  id: string;
  /** FOUNDER-REVIEW: first-run relationship quick option. */
  label: string;
  /** Stored on people.relation. Every value is in GALAXY_RELATION_PICKER_OPTIONS. */
  relation: GalaxyPickerRelation;
  /**
   * True for the one option that means this person has died. Writes
   * people.passed_at at creation, which is what puts them in the outer
   * remembrance band instead of requiring the owner to find the toggle later.
   */
  memorial: boolean;
}

/**
 * The seven quick options, in the order they are offered.
 *
 * `mother`, `father` and `other` became real picker values for this flow
 * (packages/core/src/galaxy-orbit.ts and the galaxy_relations migration) so the
 * words a person chooses here survive into the record instead of being
 * flattened into `parent` or dropped.
 *
 * The lost-person option stores `other` rather than inventing a bond we were
 * not told about: what we actually learned is that they have died, and that is
 * recorded on passed_at, which already wins over relation for the orbit band.
 */
export const FIRST_RUN_RELATION_OPTIONS: readonly FirstRunRelationOption[] = [
  { id: "partner", label: "My partner", relation: "partner", memorial: false },
  { id: "mother", label: "My mother", relation: "mother", memorial: false },
  { id: "father", label: "My father", relation: "father", memorial: false },
  { id: "child", label: "My child", relation: "child", memorial: false },
  { id: "lost", label: "Someone I have lost", relation: "other", memorial: true },
  { id: "work", label: "Someone at work", relation: "colleague", memorial: false },
  { id: "other", label: "Someone else", relation: "other", memorial: false },
] as const;

export function firstRunRelationById(id: string | null | undefined): FirstRunRelationOption | null {
  return FIRST_RUN_RELATION_OPTIONS.find((o) => o.id === id) ?? null;
}

/* ── Minor safety ───────────────────────────────────────────────────────── */

/**
 * Picker relations that carry a romantic register. These may never be stored
 * against a person who is a minor for safety purposes, no matter how the
 * relation was chosen (ENGINEERING.md §9; the same rule Compare enforces when
 * it removes romantic lenses from a pairing that includes a child).
 */
export const ROMANTIC_PICKER_RELATIONS: readonly GalaxyPickerRelation[] = ["partner", "ex"];

export function isRomanticPickerRelation(relation: string | null | undefined): boolean {
  return ROMANTIC_PICKER_RELATIONS.includes(String(relation ?? "").trim().toLowerCase() as GalaxyPickerRelation);
}

export interface MinorSafeRelationResult {
  /** The relation that may actually be stored. */
  relation: GalaxyPickerRelation;
  /** True for a minor, from the single source of truth. */
  isMinor: boolean;
  /**
   * The romantic relation that was refused, or null when nothing changed. A
   * non-null value must be shown to the user: silently rewriting what they
   * chose would be a change we made and did not admit to.
   */
  refused: GalaxyPickerRelation | null;
}

/**
 * Resolve the relation that may be stored for a person, given what the birth
 * data and the manual flag say about their age.
 *
 * Romantic relations near a minor are refused and replaced with `other`, which
 * asserts nothing. The refusal is reported back so the caller can say it out
 * loud; it is never applied quietly.
 */
export function minorSafeRelation(
  relation: GalaxyPickerRelation,
  person: MinorSafetyInput,
  now?: Date
): MinorSafeRelationResult {
  const isMinor = isMinorForSafety(person, now);
  if (isMinor && isRomanticPickerRelation(relation)) {
    return { relation: "other", isMinor, refused: relation };
  }
  return { relation, isMinor, refused: null };
}
