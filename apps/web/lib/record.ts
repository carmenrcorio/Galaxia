import {
  momentRecordBody,
  orderPair,
  recordEntryMatches,
  sanitizeFtsQuery,
  sanitizeMomentType,
  sanitizePinTheme,
  sanitizeRecordTags,
  suggestPinTheme,
  type MomentTypeId,
  type PinThemeId,
  type RecordKind,
  type RecordTagId,
  type RecordViewFilters
} from "@galaxia/core";
import {
  parseMomentTransitSnapshot,
  type MomentTransitSnapshot
} from "@galaxia/astro";
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
  /** Group-scoped notes (e.g. cohort_reading) — powers Open Groups?groupId=. */
  groupId?: string | null;
  /** For conversation entries: where to reopen. */
  href?: string;
  /** For conversation entries: the mode chip. */
  mode?: "ask" | "shared";
  /** Set when the latest message in this conversation was withdrawn (fabrication
   * remediation) — the Record preview shows this note in place of the body,
   * never the withdrawn content, and never silently drops the entry. */
  withdrawnReason?: string | null;
  /** Curated optional tags. Conversations have none. */
  tags?: RecordTagId[];
  /** Curated optional theme on a vela_pin. Other kinds stay null. */
  theme?: PinThemeId | null;
  /** Stored sky for kind=moment. Never recomputed at read time. */
  transitSnapshot?: MomentTransitSnapshot | null;
}

export type RecordScope =
  | { personId: string }
  | { pairLow: string; pairHigh: string }
  | { groupId: string };

export type { RecordViewFilters };

interface NoteRow {
  id: string; body: string; created_at: string;
  kind: RecordKind | null; payload: Record<string, unknown> | null; source_thread_id: string | null;
  group_id?: string | null;
  withdrawn_at?: string | null; withdrawn_reason?: string | null;
  tags?: unknown;
  theme?: unknown;
  transit_snapshot?: unknown;
}

function noteToEntry(row: NoteRow): RecordEntry {
  const withdrawn = Boolean(row.withdrawn_at);
  const withdrawnDisplay = withdrawn
    ? formatWithdrawnReasonForDisplay(row.withdrawn_reason)
    : null;
  return {
    id: row.id,
    kind: (row.kind ?? "note") as RecordKind,
    body: withdrawn ? (withdrawnDisplay as string) : row.body,
    createdAt: row.created_at,
    payload: row.payload ?? null,
    sourceThreadId: row.source_thread_id ?? null,
    groupId: row.group_id ?? null,
    withdrawnReason: withdrawnDisplay,
    tags: sanitizeRecordTags(row.tags),
    theme: sanitizePinTheme(row.theme),
    transitSnapshot: parseMomentTransitSnapshot(row.transit_snapshot)
  };
}

function utcRangeStart(ymd: string): string {
  return `${ymd}T00:00:00.000Z`;
}

function utcRangeEnd(ymd: string): string {
  return `${ymd}T23:59:59.999Z`;
}

function applyNotesRecordFilters<T extends {
  eq: (column: string, value: unknown) => T;
  gte: (column: string, value: string) => T;
  lte: (column: string, value: string) => T;
  contains: (column: string, value: string[]) => T;
  textSearch: (column: string, query: string, options: { type: "plain"; config: string }) => T;
}>(query: T, filters?: RecordViewFilters): T {
  let next = query;
  if (filters?.from) next = next.gte("created_at", utcRangeStart(filters.from));
  if (filters?.to) next = next.lte("created_at", utcRangeEnd(filters.to));
  if (filters?.tag) next = next.contains("tags", [filters.tag]);
  const fts = sanitizeFtsQuery(filters?.q ?? "");
  if (fts) next = next.textSearch("body", fts, { type: "plain", config: "english" });
  return next;
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
      // FOUNDER-REVIEW: rewritten (no U+2014).
      .replace(/;\s*/g, ": ")
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
function scopedNotesQuery(
  supabase: SupabaseClient,
  ownerId: string,
  scope: RecordScope,
  limit: number
) {
  let query = supabase.from("notes").select("*").eq("owner_id", ownerId).order("created_at", { ascending: false }).limit(limit);
  if ("personId" in scope) query = query.eq("about_person", scope.personId);
  else if ("groupId" in scope) query = query.eq("group_id", scope.groupId);
  else query = query.eq("pair_low", scope.pairLow).eq("pair_high", scope.pairHigh);
  return query;
}

export async function fetchRecord(
  supabase: SupabaseClient,
  ownerId: string,
  scope: RecordScope,
  limit = 40,
  filters?: RecordViewFilters
): Promise<RecordEntry[]> {
  let query = applyNotesRecordFilters(scopedNotesQuery(supabase, ownerId, scope, limit), filters);
  let { data: notes, error: notesError } = await query;
  if (notesError && filters?.q) {
    query = applyNotesRecordFilters(scopedNotesQuery(supabase, ownerId, scope, limit), { ...filters, q: undefined });
    const retried = await query;
    notes = retried.data;
  }
  const noteEntries: RecordEntry[] = (notes ?? []).map((r) => noteToEntry(r as NoteRow));

  // Person Record: also surface group cohort readings for groups this person is in,
  // so "Open Groups" can carry groupId back to the same reading surface.
  if ("personId" in scope) {
    const { data: memberships } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("person_id", scope.personId);
    const groupIds = [...new Set((memberships ?? []).map((m) => m.group_id as string).filter(Boolean))];
    if (groupIds.length > 0) {
      let cohortQuery = supabase
        .from("notes")
        .select("*")
        .eq("owner_id", ownerId)
        .eq("kind", "cohort_reading")
        .in("group_id", groupIds)
        .order("created_at", { ascending: false })
        .limit(limit);
      cohortQuery = applyNotesRecordFilters(cohortQuery, filters);
      const { data: cohortNotes } = await cohortQuery;
      const seen = new Set(noteEntries.map((e) => e.id));
      for (const row of cohortNotes ?? []) {
        const entry = noteToEntry(row as NoteRow);
        if (seen.has(entry.id)) continue;
        seen.add(entry.id);
        noteEntries.push(entry);
      }
    }
  }

  // Scoped conversations — active only (archived live under "Past conversations").
  // Tag filter is notes-only; conversations have no tags.
  let convEntries: RecordEntry[] = [];
  if (!filters?.tag) {
    let tQuery = supabase.from("threads").select("id, mode, created_at, status").eq("owner_id", ownerId).eq("status", "active").order("created_at", { ascending: false }).limit(limit);
    if ("personId" in scope) tQuery = tQuery.eq("subject_person", scope.personId);
    else if ("groupId" in scope) tQuery = tQuery.eq("group_id", scope.groupId);
    else tQuery = tQuery.eq("pair_low", scope.pairLow).eq("pair_high", scope.pairHigh);
    if (filters?.from) tQuery = tQuery.gte("created_at", utcRangeStart(filters.from));
    if (filters?.to) tQuery = tQuery.lte("created_at", utcRangeEnd(filters.to));

    const { data: threads } = await tQuery;
    convEntries = await Promise.all((threads ?? []).map((t) => fetchThreadPreview(supabase, t.id, t.created_at as string, t.mode as "ask" | "shared")));
  }

  return [...noteEntries, ...convEntries]
    .filter((entry) => !filters || recordEntryMatches(entry, filters))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
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
 * Pinned Vela insights about a person (or any pair containing them).
 * Powers the "Vela has said this about them" module. Default cap is high so
 * search and grouping can see the person's set; the UI collapses to five.
 */
export async function fetchVelaPins(
  supabase: SupabaseClient,
  ownerId: string,
  personId: string,
  limit = 200,
  filters?: { q?: string }
): Promise<RecordEntry[]> {
  let query = supabase
    .from("notes")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("kind", "vela_pin")
    .or(`about_person.eq.${personId},pair_low.eq.${personId},pair_high.eq.${personId}`)
    .order("created_at", { ascending: false })
    .limit(limit);
  const fts = sanitizeFtsQuery(filters?.q ?? "");
  if (fts) query = query.textSearch("body", fts, { type: "plain", config: "english" });
  let { data, error } = await query;
  if (error && fts) {
    query = supabase
      .from("notes")
      .select("*")
      .eq("owner_id", ownerId)
      .eq("kind", "vela_pin")
      .or(`about_person.eq.${personId},pair_low.eq.${personId},pair_high.eq.${personId}`)
      .order("created_at", { ascending: false })
      .limit(limit);
    const retried = await query;
    data = retried.data;
  }
  return (data ?? []).map((r) => noteToEntry(r as NoteRow));
}

/**
 * Set curated tags on a note. Always scopes by owner_id so a stolen note id
 * cannot write another person's Record. Conversations are threads, not notes.
 */
export async function updateNoteTags(
  supabase: SupabaseClient,
  ownerId: string,
  noteId: string,
  tags: RecordTagId[]
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("notes")
    .update({ tags: sanitizeRecordTags(tags) })
    .eq("id", noteId)
    .eq("owner_id", ownerId);
  return { error: error?.message ?? null };
}

/**
 * Set or clear the curated theme on a vela_pin. Always scopes by owner_id and
 * kind so a stolen note id cannot write another person's row or a non-pin.
 */
export async function updateNoteTheme(
  supabase: SupabaseClient,
  ownerId: string,
  noteId: string,
  theme: PinThemeId | null
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("notes")
    .update({ theme: sanitizePinTheme(theme) })
    .eq("id", noteId)
    .eq("owner_id", ownerId)
    .eq("kind", "vela_pin");
  return { error: error?.message ?? null };
}

export interface SaveMomentInput {
  ownerId: string;
  personId: string;
  selfId: string | null;
  momentType: MomentTypeId;
  userText: string;
  snapshot: MomentTransitSnapshot;
  reflection: string;
}

/**
 * Write a Moment row. Owner-scoped. The sky is the stored snapshot, never
 * typed by the user. Kind is `moment`; the type is the existing tags column.
 */
export async function saveMoment(
  supabase: SupabaseClient,
  input: SaveMomentInput
): Promise<{ id: string | null; error: string | null }> {
  const type = sanitizeMomentType(input.momentType);
  if (!type) return { id: null, error: "Unknown moment type." };
  const row: Record<string, unknown> = {
    owner_id: input.ownerId,
    about_person: input.personId,
    kind: "moment",
    body: momentRecordBody(type, input.userText),
    tags: [type],
    transit_snapshot: input.snapshot,
    payload: { reflection: input.reflection, momentType: type }
  };
  if (input.selfId && input.selfId !== input.personId) {
    const { pairLow, pairHigh } = orderPair(input.selfId, input.personId);
    row.pair_low = pairLow;
    row.pair_high = pairHigh;
  }
  const { data, error } = await supabase.from("notes").insert(row).select("id").single();
  return { id: (data?.id as string | undefined) ?? null, error: error?.message ?? null };
}

/**
 * Pin the Moment reflection through the existing vela_pin path, including
 * the curated theme field. Always owner-scoped.
 */
export async function pinMomentReflection(
  supabase: SupabaseClient,
  input: {
    ownerId: string;
    personId: string;
    selfId: string | null;
    sourceMomentId: string;
    reflection: string;
  }
): Promise<{ id: string | null; theme: PinThemeId | null; error: string | null }> {
  const theme = suggestPinTheme(input.reflection);
  const row: Record<string, unknown> = {
    owner_id: input.ownerId,
    about_person: input.personId,
    kind: "vela_pin",
    body: input.reflection.trim(),
    theme,
    payload: { sourceMomentId: input.sourceMomentId }
  };
  if (input.selfId && input.selfId !== input.personId) {
    const { pairLow, pairHigh } = orderPair(input.selfId, input.personId);
    row.pair_low = pairLow;
    row.pair_high = pairHigh;
  }
  const { data, error } = await supabase.from("notes").insert(row).select("id").single();
  return {
    id: (data?.id as string | undefined) ?? null,
    theme,
    error: error?.message ?? null
  };
}
