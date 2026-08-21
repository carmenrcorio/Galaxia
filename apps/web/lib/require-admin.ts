import "server-only";

import { createClient } from "@supabase/supabase-js";
import { isAdmin } from "@galaxia/core";
import { redirect } from "next/navigation";
import { missingEnvMessage, publicEnv } from "./env";
import { privateEnv } from "./env.server";
import { readAdminRow } from "./read-admin-row";
import { requireUser } from "./supabase/require-user";

/**
 * requireAdmin — THE single admin gate. Every admin-gated server route,
 * server action, and page must call this, and only this, to decide "is the
 * caller allowed to be here?" — never re-derive the check inline, and never
 * trust a client-supplied role, header, cookie claim, or a value passed
 * down as a prop from a parent component.
 *
 * Layers on top of the same real authentication every other server route
 * already uses (`requireUser` -> the cookie-backed Supabase session ->
 * `auth.getUser()`), then reads `admin_users` for that verified
 * `auth.uid()` using a SERVICE-ROLE client — the same construction already
 * used in `apps/web/app/api/cancel/route.ts` — because `admin_users` has no
 * RLS policy for anon/authenticated at all (see the
 * `20260821191500_admin_role_foundation.sql` migration): a request made
 * with the signed-in user's own (anon-key) session client would get an
 * empty/denied result for every id, admin or not, which would fail closed
 * for the wrong reason. The service-role read is what actually answers the
 * question; `requireUser` only establishes who is asking.
 *
 * Redirects (never silently no-ops) to `nextPath` (default `/app`) when the
 * caller is not signed in (via `requireUser`) or is signed in but not an
 * admin. Route handlers that need a JSON 403 instead of a redirect should
 * use `readAdminRow` + `isAdmin` directly with their own service-role
 * client and their own `auth.getUser()` call, rather than reimplementing
 * this decision — but that need does not exist in this phase (no admin
 * routes are built yet).
 */
export async function requireAdmin(nextPath = "/app") {
  const { supabase, user } = await requireUser(nextPath);

  if (!publicEnv.supabaseUrl || !privateEnv.serviceRole) {
    throw new Error(missingEnvMessage("SUPABASE_SERVICE_ROLE_KEY"));
  }
  const serviceRoleClient = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, {
    auth: { persistSession: false }
  });

  const row = await readAdminRow(serviceRoleClient, user.id);
  if (!isAdmin(row)) {
    redirect(nextPath);
  }

  return { supabase, user };
}
