import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * One row of `admin_audit_log`, resolved for display on the per-user
 * detail page. `before`/`after` pass through exactly what the database has
 * — see the NEVER-FABRICATE note below.
 */
export interface AdminAuditHistoryEntry {
  id: string;
  action: string;
  actorId: string;
  /** The actor's email, resolved via the Admin API, or null if it can no longer be resolved. */
  actorEmail: string | null;
  targetUserId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string | null;
  /**
   * NEVER-FABRICATE (ENGINEERING.md §12): `before`/`after` are `null` on
   * every existing `admin_audit_log` row — no writer populates them yet
   * (confirmed against the migration and every current writer in
   * `audit-log.ts`/`comp.ts`/`support-requests.ts`/`resend-email.ts`).
   * This reader passes the column through exactly as stored (`null` stays
   * `null`) — it must never infer "no change" or synthesize a diff when
   * the value is absent. The caller renders a null value as absent/unknown,
   * never as a guessed prior/next state.
   */
  before: unknown | null;
  after: unknown | null;
}

interface AuditLogRow {
  id: string;
  actor_id: string;
  action: string;
  target_user_id: string | null;
  before: unknown | null;
  after: unknown | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
}

const AUDIT_LOG_FIELDS = "id, actor_id, action, target_user_id, before, after, metadata, created_at";

/**
 * FIRST reader of `admin_audit_log` — every existing caller only writes it
 * (via `writeAdminAuditLog`). Reads every row for one target user, newest
 * first, and resolves each distinct `actor_id` to an email via the
 * Supabase Auth Admin API — same Admin-API source `listAdminUsers` uses
 * for the list's own emails, just a per-actor `getUserById` lookup instead
 * of a bulk `listUsers()` page (an admin roster is small, so the extra
 * round trips per unique actor are cheap, and it avoids pulling every auth
 * user just to resolve a handful of actor ids). Renders the bare UUID (via
 * `actorEmail: null`) instead of hiding the row when an actor's auth user
 * can no longer be resolved (e.g. a deleted admin account) — the caller
 * decides how to display that, this function never drops a row.
 *
 * Reads only `admin_audit_log` plus `auth.users` (for actor email
 * resolution) — never `people`, `notes`, `threads`, or any Vela table.
 * Takes an already-constructed service-role client (mirrors
 * `writeAdminAuditLog`'s own shape) rather than building one from env —
 * this keeps the module free of a `server-only` import so it stays
 * directly unit-testable with a mocked client.
 */
export async function readAdminAuditHistory(
  serviceRoleClient: SupabaseClient,
  targetUserId: string
): Promise<AdminAuditHistoryEntry[]> {
  const { data, error } = await serviceRoleClient
    .from("admin_audit_log")
    .select(AUDIT_LOG_FIELDS)
    .eq("target_user_id", targetUserId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as AuditLogRow[];
  const actorIds = [...new Set(rows.map((row) => row.actor_id))];

  const actorEmailById = new Map<string, string | null>();
  for (const actorId of actorIds) {
    const { data: actorData } = await serviceRoleClient.auth.admin.getUserById(actorId);
    actorEmailById.set(actorId, actorData?.user?.email ?? null);
  }

  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    actorId: row.actor_id,
    actorEmail: actorEmailById.get(row.actor_id) ?? null,
    targetUserId: row.target_user_id,
    metadata: row.metadata ?? null,
    createdAt: row.created_at,
    before: row.before ?? null,
    after: row.after ?? null
  }));
}
