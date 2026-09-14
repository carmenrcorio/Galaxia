import {
  resolveFirstRunResume,
  type FirstRunProfileRow,
  type FirstRunRecord,
  type FirstRunStep,
  type FirstRunTerminal,
} from "@galaxia/core";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Reads and writes the two first-run columns on `profiles`
 * (20260914210000_profiles_onboarding_state.sql). The decision logic itself
 * lives in @galaxia/core so mobile can share it; this file is only the I/O.
 *
 * Every write here is best effort. Progress recording exists to make a resume
 * land in the right place, and a failed write costs the reader a repeated
 * step, never their data. Blocking the flow on it would trade a real loss for
 * a cosmetic one.
 */

export const FIRST_RUN_PROFILE_COLUMNS = "onboarding_step, onboarding_completed_at";

export async function readFirstRunProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<FirstRunProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(FIRST_RUN_PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();
  // A missing row means the new-user trigger has not settled yet. Returning
  // null reads as "not started", which shows the flow, rather than as
  // "finished", which would silently swallow it.
  if (error) return null;
  return (data as FirstRunProfileRow | null) ?? null;
}

/** Record where the reader is, so closing the tab resumes here. */
export async function recordFirstRunStep(
  supabase: SupabaseClient,
  userId: string,
  step: FirstRunStep
): Promise<void> {
  await supabase.from("profiles").update({ onboarding_step: step }).eq("id", userId);
}

/**
 * Stop offering the flow. `done` means they reached the end, `skipped` means
 * they left early on purpose. Both stamp `onboarding_completed_at`, which is
 * the single signal that keeps the flow from repeating itself.
 */
export async function settleFirstRun(
  supabase: SupabaseClient,
  userId: string,
  outcome: FirstRunTerminal
): Promise<void> {
  await supabase
    .from("profiles")
    .update({ onboarding_step: outcome, onboarding_completed_at: new Date().toISOString() })
    .eq("id", userId);
}

/** Re-open the flow for someone who skipped it and asked for it back. */
export async function reopenFirstRun(supabase: SupabaseClient, userId: string): Promise<void> {
  await supabase
    .from("profiles")
    .update({ onboarding_step: null, onboarding_completed_at: null })
    .eq("id", userId);
}

export interface FirstRunEntry {
  profile: FirstRunProfileRow | null;
  record: FirstRunRecord;
  step: FirstRunStep;
}

/** The record half of the resume decision, from the people rows already loaded. */
export function firstRunRecordFromPeople(people: { is_self?: boolean | null }[]): FirstRunRecord {
  return {
    hasSelf: people.some((p) => p.is_self === true),
    hasOther: people.some((p) => p.is_self !== true),
  };
}

export function resolveFirstRunEntry(
  profile: FirstRunProfileRow | null,
  people: { is_self?: boolean | null }[]
): FirstRunEntry {
  const record = firstRunRecordFromPeople(people);
  return { profile, record, step: resolveFirstRunResume(profile, record) };
}
