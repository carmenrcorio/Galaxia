import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminRow } from "@galaxia/core";

/**
 * Reads the `admin_users` row for `userId` using the given client, which
 * MUST be a service-role client — `admin_users` has no RLS policy for
 * anon/authenticated at all, so a user-session client cannot read this
 * table regardless of whose id is passed in (it would return null/denied
 * for every id, admin or not, which would be a false negative for the
 * wrong reason). See `requireAdmin` in `require-admin.ts` for the real
 * caller, which constructs that service-role client from server-only env.
 *
 * Deliberately takes the client as a parameter (dependency injection)
 * rather than constructing it here, so this function has no dependency on
 * `server-only` / `env.server.ts` and can be exercised directly against the
 * live project in tests (see `read-admin-row.test.ts`) — the same
 * constraint `timezone-wiring.test.ts` and `nudge-compute-route-wiring.
 * test.ts` document for files that import `server-only` transitively.
 */
export async function readAdminRow(
  serviceRoleClient: SupabaseClient,
  userId: string
): Promise<AdminRow | null> {
  const { data } = await serviceRoleClient
    .from("admin_users")
    .select("role")
    .eq("owner_id", userId)
    .maybeSingle();
  return (data as AdminRow | null) ?? null;
}
