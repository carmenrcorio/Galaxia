import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * A support_requests row as read by the admin view. `handled_by`/
 * `handled_at` are only ever set by `transitionSupportRequest` below (the
 * close/reopen actions), never by the client — the INSERT policy the
 * in-app form uses only allows `owner_id`, `email`, `subject`, `body`.
 */
export interface AdminSupportRequestRow {
  id: string;
  owner_id: string;
  email: string;
  subject: string;
  body: string;
  status: "open" | "closed";
  created_at: string;
  handled_by: string | null;
  handled_at: string | null;
}

const SUPPORT_REQUEST_FIELDS = "id, owner_id, email, subject, body, status, created_at, handled_by, handled_at";

/**
 * Puts open requests before closed ones, newest-first within each group.
 * Pulled out as a pure function (no DB) so the ordering itself is directly
 * unit-testable — `listAdminSupportRequests` below sorts client-side
 * because `open`/`closed`'s alphabetical order (`closed` < `open`) is the
 * opposite of the order the admin view wants, and a single `order()` call
 * against Postgres can't express "this text column, but open-before-closed
 * specifically" without a second generated column. `Array.prototype.sort`
 * is stable per the ES2019 spec, so ties within a status keep the
 * already-fetched `created_at desc` order from the query.
 */
export function sortSupportRequestsOpenFirst<T extends { status: "open" | "closed" }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (a.status === b.status) return 0;
    return a.status === "open" ? -1 : 1;
  });
}

/**
 * Reads every support request for the admin view (open first, newest
 * first within each group). ALWAYS uses a service-role client passed in by
 * the caller (the `/admin/support` server component) — this must never be
 * called with a user-session client; `support_requests` has no select
 * policy for anon/authenticated at all, so a user-session client would get
 * a permission-denied error, not merely an empty/filtered result.
 */
export async function listAdminSupportRequests(
  serviceRoleClient: SupabaseClient
): Promise<AdminSupportRequestRow[]> {
  const { data, error } = await serviceRoleClient
    .from("support_requests")
    .select(SUPPORT_REQUEST_FIELDS)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return sortSupportRequestsOpenFirst((data ?? []) as AdminSupportRequestRow[]);
}

export type SupportRequestTransition = "close" | "reopen";

export class SupportRequestNotFoundError extends Error {
  constructor(requestId: string) {
    super(`Support request "${requestId}" not found.`);
    this.name = "SupportRequestNotFoundError";
  }
}

export class SupportRequestConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupportRequestConflictError";
  }
}

/**
 * Closes or reopens a support request, setting `status` + `handled_by` +
 * `handled_at` together in one update. Only transitions from the expected
 * current state (`open` -> close, `closed` -> reopen) — attempting to
 * close an already-closed request (or reopen an already-open one) throws
 * {@link SupportRequestConflictError} rather than silently re-stamping
 * `handled_by`/`handled_at` for a no-op state change.
 *
 * Does NOT write the audit row itself — the caller (the close/reopen route
 * handler) calls `writeAdminAuditLog` in the same function, after this
 * resolves, per the "one shared helper, called by every mutating action"
 * contract. Takes an already-constructed service-role client (mirrors
 * `readAdminRow`) and imports no `server-only`, so it stays directly
 * live-DB-testable.
 */
export async function transitionSupportRequest(
  serviceRoleClient: SupabaseClient,
  requestId: string,
  adminId: string,
  transition: SupportRequestTransition
): Promise<AdminSupportRequestRow> {
  const targetStatus: "open" | "closed" = transition === "close" ? "closed" : "open";
  const requiredCurrentStatus: "open" | "closed" = transition === "close" ? "open" : "closed";

  const { data: existing, error: fetchError } = await serviceRoleClient
    .from("support_requests")
    .select("id, status")
    .eq("id", requestId)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!existing) throw new SupportRequestNotFoundError(requestId);
  if (existing.status !== requiredCurrentStatus) {
    throw new SupportRequestConflictError(
      transition === "close"
        ? "This request is already closed."
        : "This request is already open."
    );
  }

  const { data: updated, error: updateError } = await serviceRoleClient
    .from("support_requests")
    .update({ status: targetStatus, handled_by: adminId, handled_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("status", requiredCurrentStatus)
    .select(SUPPORT_REQUEST_FIELDS)
    .maybeSingle();
  if (updateError) throw new Error(updateError.message);
  if (!updated) {
    // The extra `.eq("status", requiredCurrentStatus)` above means a
    // concurrent transition between the read and this write also lands
    // here (0 rows matched) rather than silently overwriting it.
    throw new SupportRequestConflictError(
      transition === "close"
        ? "This request is already closed."
        : "This request is already open."
    );
  }
  return updated as AdminSupportRequestRow;
}
