import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The Relationship Record — the single date-ordered layer that sits on top of
 * the (immutable) natal chart. Every note, tending note, pinned Vela insight,
 * and saved reading for a scope (person / pair / group) lives in one `notes`
 * store; conversations come from `threads`. This module is the only read/write
 * path so the "one store" guarantee holds.
 *
 * Honesty note: saved readings are dated snapshots. computeSynastry is
 * deterministic, so we never derive a "trend" from two snapshots — a re-run
 * difference is attributed to an input change (engineVersion / birthFingerprint).
 */

export type RecordKind = "note" | "tending" | "vela_pin" | "compare_reading" | "cohort_reading";

export interface RecordEntry {
  id: string;
  kind: RecordKind | "conversation";
  body: string;
  createdAt: string;
  payload?: Record<string, unknown> | null;
  sourceThreadId?: string | null;
  /** For conversation entries: where to reopen. */
  href?: string;
  /** For conversation entries: the mode chip. */
  mode?: "ask" | "shared";
}

export type RecordScope =
  | { personId: string }
  | { pairLow: string; pairHigh: string }
  | { groupId: string };

interface NoteRow {
  id: string; body: string; created_at: string;
  kind: RecordKind | null; payload: Record<string, unknown> | null; source_thread_id: string | null;
}

/** Order a pair id tuple deterministically (matches the edge function). */
export function orderPair(a: string, b: string): { pairLow: string; pairHigh: string } {
  return a < b ? { pairLow: a, pairHigh: b } : { pairLow: b, pairHigh: a };
}

/**
 * Fetch the Record for a scope: notes of all kinds ∪ scoped conversations,
 * newest first. Resilient to the pre-migration state (falls back to select *).
 */
export async function fetchRecord(
  supabase: SupabaseClient,
  ownerId: string,
  scope: RecordScope,
  limit = 40
): Promise<RecordEntry[]> {
  let query = supabase.from("notes").select("*").eq("owner_id", ownerId).order("created_at", { ascending: false }).limit(limit);
  if ("personId" in scope) query = query.eq("about_person", scope.personId);
  else if ("groupId" in scope) query = query.eq("group_id", scope.groupId);
  else query = query.eq("pair_low", scope.pairLow).eq("pair_high", scope.pairHigh);

  const { data: notes } = await query;
  const noteEntries: RecordEntry[] = (notes ?? []).map((r) => {
    const row = r as NoteRow;
    return {
      id: row.id,
      kind: (row.kind ?? "note") as RecordKind,
      body: row.body,
      createdAt: row.created_at,
      payload: row.payload ?? null,
      sourceThreadId: row.source_thread_id ?? null
    };
  });

  // Scoped conversations
  let tQuery = supabase.from("threads").select("id, mode, created_at").eq("owner_id", ownerId).order("created_at", { ascending: false }).limit(limit);
  if ("personId" in scope) tQuery = tQuery.eq("subject_person", scope.personId);
  else if ("groupId" in scope) tQuery = tQuery.eq("group_id", scope.groupId);
  else tQuery = tQuery.eq("pair_low", scope.pairLow).eq("pair_high", scope.pairHigh);

  const { data: threads } = await tQuery;
  const convEntries: RecordEntry[] = await Promise.all((threads ?? []).map(async (t) => {
    const { data: msg } = await supabase.from("messages").select("body").eq("thread_id", t.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    return {
      id: `thread-${t.id}`,
      kind: "conversation" as const,
      body: (msg?.body as string | undefined)?.slice(0, 120) ?? "Vela conversation",
      createdAt: t.created_at as string,
      href: `/app/vela?threadId=${t.id}`,
      mode: (t.mode as "ask" | "shared")
    };
  }));

  return [...noteEntries, ...convEntries].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/**
 * The last N pinned Vela insights about a person (or any pair containing them).
 * Powers the "Vela has said this about them" module.
 */
export async function fetchVelaPins(
  supabase: SupabaseClient,
  ownerId: string,
  personId: string,
  limit = 2
): Promise<RecordEntry[]> {
  const { data } = await supabase
    .from("notes")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("kind", "vela_pin")
    .or(`about_person.eq.${personId},pair_low.eq.${personId},pair_high.eq.${personId}`)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => {
    const row = r as NoteRow;
    return { id: row.id, kind: "vela_pin" as const, body: row.body, createdAt: row.created_at, sourceThreadId: row.source_thread_id ?? null };
  });
}
