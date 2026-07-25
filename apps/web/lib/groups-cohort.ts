import {
  buildGroupsCurrentPayload,
  cohortStateFromGroupsCurrentPayload,
  GROUPS_CURRENT_SOURCE,
  memberSetHash,
  selectGroupsCurrentForRoster,
  type CohortOverlaySnapshot,
  type CohortPairHighlight,
  type CohortReadingState
} from "@galaxia/core";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Load the current Groups reading for a live roster, or null on miss
 * (caller computes + upserts).
 */
export async function fetchGroupsCurrentReading(
  supabase: SupabaseClient,
  ownerId: string,
  groupId: string,
  memberIds: readonly string[]
): Promise<{ noteId: string; state: CohortReadingState } | null> {
  const hash = memberSetHash(memberIds);
  const { data, error } = await supabase
    .from("notes")
    .select("id, payload, member_set_hash")
    .eq("owner_id", ownerId)
    .eq("group_id", groupId)
    .eq("kind", "cohort_reading")
    .eq("member_set_hash", hash)
    .filter("payload->>source", "eq", GROUPS_CURRENT_SOURCE)
    .limit(5);
  if (error || !data?.length) return null;
  const match = selectGroupsCurrentForRoster(memberIds, data);
  if (!match) return null;
  const state = cohortStateFromGroupsCurrentPayload(match.payload);
  if (!state) return null;
  return { noteId: match.id, state };
}

/** Upsert the current Groups reading keyed by (group_id, member_set_hash). */
export async function upsertGroupsCurrentReading(
  supabase: SupabaseClient,
  input: {
    ownerId: string;
    groupId: string;
    groupName: string;
    memberIds: readonly string[];
    memberNames: readonly string[];
    overlay: CohortOverlaySnapshot;
    pairHighlights: readonly CohortPairHighlight[];
  }
): Promise<{ error: string | null }> {
  const payload = buildGroupsCurrentPayload({
    memberIds: input.memberIds,
    memberNames: input.memberNames,
    overlay: input.overlay,
    pairHighlights: input.pairHighlights
  });
  // FOUNDER-REVIEW: authored — body line for the current Groups cohort reading note.
  const body = `Current cohort reading for ${input.groupName}: ${payload.overlay.label}`;

  const { data: existingRows } = await supabase
    .from("notes")
    .select("id, payload, member_set_hash")
    .eq("owner_id", input.ownerId)
    .eq("group_id", input.groupId)
    .eq("kind", "cohort_reading")
    .eq("member_set_hash", payload.member_set_hash)
    .filter("payload->>source", "eq", GROUPS_CURRENT_SOURCE)
    .limit(5);

  const existing = selectGroupsCurrentForRoster(input.memberIds, existingRows ?? []);

  if (existing?.id) {
    const { error } = await supabase
      .from("notes")
      .update({
        body,
        payload,
        member_set_hash: payload.member_set_hash
      })
      .eq("id", existing.id)
      .eq("owner_id", input.ownerId);
    return { error: error?.message ?? null };
  }

  const { error } = await supabase.from("notes").insert({
    owner_id: input.ownerId,
    group_id: input.groupId,
    kind: "cohort_reading",
    body,
    payload,
    member_set_hash: payload.member_set_hash
  });

  // Unique index race: concurrent insert — retry as update.
  if (error && /duplicate|unique|notes_groups_current_roster/i.test(error.message)) {
    const { data: raced } = await supabase
      .from("notes")
      .select("id")
      .eq("owner_id", input.ownerId)
      .eq("group_id", input.groupId)
      .eq("kind", "cohort_reading")
      .eq("member_set_hash", payload.member_set_hash)
      .filter("payload->>source", "eq", GROUPS_CURRENT_SOURCE)
      .maybeSingle();
    if (raced?.id) {
      const { error: updErr } = await supabase
        .from("notes")
        .update({ body, payload, member_set_hash: payload.member_set_hash })
        .eq("id", raced.id)
        .eq("owner_id", input.ownerId);
      return { error: updErr?.message ?? null };
    }
  }

  return { error: error?.message ?? null };
}
