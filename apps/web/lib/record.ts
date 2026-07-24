import type { RecordKind } from "@galaxia/core";
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
 * difference is attributed via chartFingerprint (placement longitudes) and
 * birthFingerprint, plus the DB engine_version of each chart actually scored.
 */

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
  /** Set when the latest message in this conversation was withdrawn (fabrication
   * remediation) — the Record preview shows this note in place of the body,
   * never the withdrawn content, and never silently drops the entry. */
  withdrawnReason?: string | null;
}

export type RecordScope =
  | { personId: string }
  | { pairLow: string; pairHigh: string }
  | { groupId: string };

interface NoteRow {
  id: string; body: string; created_at: string;
  kind: RecordKind | null; payload: Record<string, unknown> | null; source_thread_id: string | null;
  withdrawn_at?: string | null; withdrawn_reason?: string | null;
}

// ─── Withdrawn preview voice (read-time only; DB reason untouched) ───────────

// FOUNDER-REVIEW: authored — generic withdrawn preview when the stored reason
// has no asserted/computed/date shape we can restate plainly.
const WITHDRAWN_PREVIEW_FALLBACK =
  "We caught an answer here that didn't match the chart on file, so we withdrew it.";

// FOUNDER-REVIEW: authored — older client/DB fallback, restated in the same voice.
const LEGACY_GENERIC_REASON =
  "This note referenced inaccurate chart data and has been withdrawn.";

function formatWithdrawalDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function stripConfidentTag(s: string): string {
  return s.replace(/\s*\(confident\)\s*/gi, " ").replace(/\s+/g, " ").trim();
}

/**
 * Turn a stored `withdrawn_reason` into plain product copy for list previews.
 * Does not mutate the database — audit-voice reasons stay as written for the
 * record. Always returns a non-empty string (never silently drop).
 */
export function formatWithdrawnReasonForDisplay(
  reason: string | null | undefined
): string {
  const raw = reason?.trim();
  if (!raw || raw === LEGACY_GENERIC_REASON) return WITHDRAWN_PREVIEW_FALLBACK;

  const auditMatch = raw.match(
    /^(.*?)\s*Detected by fabrication audit,\s*(\d{4}-\d{2}-\d{2})\.?\s*$/i
  );
  const head = (auditMatch?.[1] ?? raw).trim().replace(/[.;\s]+$/, "");
  const when = auditMatch?.[2] ? formatWithdrawalDate(auditMatch[2]) : null;
  // FOUNDER-REVIEW: authored — date clause for withdrawn previews.
  const whenClause = when ? ` on ${when}` : "";

  const computedMatch = head.match(
    /^Asserted\s+(.+?);\s*computed chart shows\s+(.+)$/i
  );
  if (computedMatch) {
    const asserted = stripConfidentTag(computedMatch[1]!);
    const chartShows = stripConfidentTag(computedMatch[2]!);
    // FOUNDER-REVIEW: authored — asserted vs computed chart withdrawal preview.
    return `Vela said ${asserted}, but the chart on file shows ${chartShows}. We withdrew that answer${whenClause}.`;
  }

  const assertedMatch = head.match(/^Asserted\s+(.+)$/i);
  if (assertedMatch) {
    const detail = stripConfidentTag(assertedMatch[1]!)
      .replace(/;\s*/g, " — ")
      .replace(/\ba confident\b/gi, "a");
    // FOUNDER-REVIEW: authored — asserted-without-computed withdrawal preview
    // (e.g. year-only birth where a concrete sign cannot be supported).
    return `Vela stated ${detail}. That didn't hold against the chart on file, so we withdrew that answer${whenClause}.`;
  }

  if (when) {
    // FOUNDER-REVIEW: authored — withdrawal with date when the head isn't Asserted-shaped.
    return `We caught an answer here that didn't match the chart on file, so we withdrew it${whenClause}.`;
  }

  return WITHDRAWN_PREVIEW_FALLBACK;
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
    const withdrawn = Boolean(row.withdrawn_at);
    // Display voice only — `withdrawn_reason` in the DB stays audit-voice.
    const withdrawnDisplay = withdrawn
      ? formatWithdrawnReasonForDisplay(row.withdrawn_reason)
      : null;
    return {
      id: row.id,
      kind: (row.kind ?? "note") as RecordKind,
      // A withdrawn note never shows its original content — only the note.
      body: withdrawn ? (withdrawnDisplay as string) : row.body,
      createdAt: row.created_at,
      payload: row.payload ?? null,
      sourceThreadId: row.source_thread_id ?? null,
      withdrawnReason: withdrawnDisplay
    };
  });

  // Scoped conversations — active only (archived live under "Past conversations")
  let tQuery = supabase.from("threads").select("id, mode, created_at, status").eq("owner_id", ownerId).eq("status", "active").order("created_at", { ascending: false }).limit(limit);
  if ("personId" in scope) tQuery = tQuery.eq("subject_person", scope.personId);
  else if ("groupId" in scope) tQuery = tQuery.eq("group_id", scope.groupId);
  else tQuery = tQuery.eq("pair_low", scope.pairLow).eq("pair_high", scope.pairHigh);

  const { data: threads } = await tQuery;
  const convEntries: RecordEntry[] = await Promise.all((threads ?? []).map((t) => fetchThreadPreview(supabase, t.id, t.created_at as string, t.mode as "ask" | "shared")));

  return [...noteEntries, ...convEntries].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/**
 * Preview for a single thread: the latest message. If that message was
 * withdrawn (fabrication remediation), the preview shows the withdrawal note
 * instead of the body — never the withdrawn content, never silently dropped.
 */
async function fetchThreadPreview(
  supabase: SupabaseClient,
  threadId: string,
  createdAt: string,
  mode: "ask" | "shared"
): Promise<RecordEntry> {
  const { data: msg } = await supabase.from("messages").select("*").eq("thread_id", threadId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const row = msg as { body?: string; withdrawn_at?: string | null; withdrawn_reason?: string | null } | null;
  const withdrawn = Boolean(row?.withdrawn_at);
  // Display voice only — stored `withdrawn_reason` is never overwritten.
  const withdrawnDisplay = withdrawn
    ? formatWithdrawnReasonForDisplay(row?.withdrawn_reason)
    : null;
  return {
    id: `thread-${threadId}`,
    kind: "conversation" as const,
    body: withdrawn
      ? (withdrawnDisplay as string)
      : (row?.body ?? "").slice(0, 120) || "Vela conversation",
    createdAt,
    href: `/app/vela?threadId=${threadId}`,
    mode,
    withdrawnReason: withdrawnDisplay
  };
}

/** Archived conversations for a person (subject or in a pair). Powers "Past conversations". */
export async function fetchArchivedThreads(
  supabase: SupabaseClient,
  ownerId: string,
  personId: string,
  limit = 40
): Promise<RecordEntry[]> {
  const { data: threads } = await supabase
    .from("threads")
    .select("id, mode, created_at")
    .eq("owner_id", ownerId)
    .eq("status", "archived")
    .or(`subject_person.eq.${personId},pair_low.eq.${personId},pair_high.eq.${personId}`)
    .order("created_at", { ascending: false })
    .limit(limit);
  return Promise.all((threads ?? []).map((t) => fetchThreadPreview(supabase, t.id, t.created_at as string, t.mode as "ask" | "shared")));
}

/** Set a thread's status. Never deletes. */
export async function setThreadStatus(supabase: SupabaseClient, threadId: string, status: "active" | "archived"): Promise<void> {
  await supabase.from("threads").update({ status }).eq("id", threadId);
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
    const withdrawn = Boolean(row.withdrawn_at);
    const withdrawnDisplay = withdrawn
      ? formatWithdrawnReasonForDisplay(row.withdrawn_reason)
      : null;
    return {
      id: row.id, kind: "vela_pin" as const,
      body: withdrawn ? (withdrawnDisplay as string) : row.body,
      createdAt: row.created_at, sourceThreadId: row.source_thread_id ?? null,
      withdrawnReason: withdrawnDisplay
    };
  });
}
