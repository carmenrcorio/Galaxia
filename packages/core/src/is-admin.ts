/**
 * Admin authorization — the single source of truth for "is this user an
 * admin?", distinct from `hasAccess` (entitlement — can they use the
 * product at all). This is the SECURITY-CRITICAL gate for every admin
 * surface (admin portal, content authoring, billing exceptions): an admin
 * can do what the security audit proved regular users cannot (read billing,
 * write comped, modify accounts), so this check must never drift per-route.
 *
 * This module is intentionally pure — no DB, no Supabase client, no
 * request/session handling. It decides from an already-fetched row, the
 * same shape `profileAllowsAccess` takes an already-fetched `profiles` row
 * in has-access.ts. The row must always be fetched via a trusted path (the
 * service-role read in apps/web/lib/require-admin.ts) — never from anything
 * client-supplied (a header, a cookie claim, a prop passed from a parent).
 * `admin_users` has no client RLS policy at all, so a user-session read of
 * it is not merely denied, it returns nothing to decide from either way —
 * the service-role read is required, not optional.
 */

/** Row shape read from `admin_users` for a given `owner_id`. */
export interface AdminRow {
  role?: string | null;
}

/**
 * Roles that grant admin access today. Deliberately a closed, explicit set
 * rather than "any non-null role" — the `role` column's vocabulary can grow
 * later (e.g. a future non-admin role like a suspended/revoked marker) and
 * an unrecognized value must fail closed, not be treated as admin by
 * default.
 */
const ADMIN_ROLES = new Set(["admin"]);

/**
 * Fail-closed: no row (the user has no `admin_users` row at all) -> false.
 * A row with an unrecognized/non-admin role value -> false. Only a row
 * whose `role` is in the known admin vocabulary -> true.
 */
export function isAdmin(row: AdminRow | null | undefined): boolean {
  if (!row) return false;
  const role = row.role;
  if (!role) return false;
  return ADMIN_ROLES.has(role);
}
