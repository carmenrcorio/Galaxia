import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The closed audit-action vocabulary (LOCKED, Stage 2 scope). Every
 * mutating admin action writes exactly one of these — never free text, and
 * never a vocabulary defined again inline at the call site.
 * `writeAdminAuditLog` fails closed on anything outside this set instead of
 * silently logging (or worse, silently swallowing) an unrecognized action.
 */
export const ADMIN_AUDIT_ACTIONS = [
  "resend_confirmation_email",
  "resend_password_reset_email",
  "close_support_request",
  "reopen_support_request"
] as const;

export type AdminAuditAction = (typeof ADMIN_AUDIT_ACTIONS)[number];

export function isAdminAuditAction(value: string): value is AdminAuditAction {
  return (ADMIN_AUDIT_ACTIONS as readonly string[]).includes(value);
}

export interface WriteAdminAuditLogInput {
  /**
   * The verified admin's id from the guard's own session read
   * (requireAdminApi()'s `user.id`) — never anything client-supplied (a
   * body field, a header, a query param). Callers must not accept this
   * value from the request.
   */
  actorId: string;
  action: AdminAuditAction;
  targetUserId?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * The ONE writer of `admin_audit_log` — every mutating admin action
 * (resend-email, close/reopen support request, and anything added later)
 * imports this instead of inserting into the table itself, and calls it in
 * the SAME server function as its mutation, not queued/deferred/best-effort.
 * Reads never call this.
 *
 * Deliberately NOT fire-and-forget: an insert failure throws instead of
 * being caught and ignored, so the caller's response surfaces a failure
 * rather than returning success for a privileged action that went
 * unlogged. An unlogged privileged action is worse than a failed one.
 *
 * Takes an already-constructed service-role client (mirrors
 * `readAdminRow`'s shape) rather than building one from env itself — this
 * keeps the module free of a `server-only` import so it stays directly
 * unit-testable and live-DB-testable, the same trade-off
 * `lib/read-admin-row.ts` documents for itself.
 */
export async function writeAdminAuditLog(
  serviceRoleClient: SupabaseClient,
  { actorId, action, targetUserId, metadata }: WriteAdminAuditLogInput
): Promise<void> {
  if (!isAdminAuditAction(action)) {
    throw new Error(`writeAdminAuditLog: "${action}" is not in the closed audit-action vocabulary`);
  }
  if (!actorId) {
    throw new Error("writeAdminAuditLog: actorId is required");
  }

  const { error } = await serviceRoleClient.from("admin_audit_log").insert({
    actor_id: actorId,
    action,
    target_user_id: targetUserId ?? null,
    metadata: metadata ?? null
  });

  if (error) {
    throw new Error(`writeAdminAuditLog: insert failed (${error.message})`);
  }
}
