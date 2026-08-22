import "server-only";

import { createClient, type User } from "@supabase/supabase-js";
import { isAdmin } from "@galaxia/core";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { missingEnvMessage, publicEnv } from "./env";
import { privateEnv } from "./env.server";
import { readAdminRow } from "./read-admin-row";
import { createSupabaseServerClient } from "./supabase/server";
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
    // `nextPath` is a caller-supplied `string`, not a literal route, so
    // Next's typedRoutes (next.config.mjs) can't narrow it to `Route` —
    // same `as never` escape used for a dynamic href in app-nav.tsx. This
    // is a type-only cast; it changes nothing about where this redirects.
    redirect(nextPath as never);
  }

  return { supabase, user };
}

/**
 * Result of {@link requireAdminApi} — either a `NextResponse` to return
 * immediately (denied) or `{ user }` (allowed). Deliberately a plain
 * `instanceof`-narrowable union rather than a `{ ok: boolean; ... }`
 * discriminated union: this repo's `apps/web/tsconfig.json` sets
 * `"strict": false` (so `strictNullChecks` is off), and TypeScript's
 * control-flow narrowing on a boolean-literal discriminant (`if (!guard.ok)
 * return guard.response`) silently fails to narrow under that setting —
 * confirmed by reproducing it in isolation, not a guess. `instanceof`
 * narrowing has no such dependency and works the same with or without
 * `strictNullChecks`.
 */
export type RequireAdminApiResult = NextResponse | { user: User };

/**
 * requireAdminApi — the JSON-403 sibling of requireAdmin() for `/api/admin/**`
 * route handlers. `requireAdmin()` redirects on failure, which is the right
 * "denied" signal for a page render but not for a fetch/curl caller hitting
 * a route directly — the whole point of a route handler calling its own
 * guard (rather than trusting the `/admin` layout above it) is that a
 * caller who bypasses the layout entirely still gets a real denial, not a
 * 30x it can silently follow or ignore.
 *
 * Same two checks as requireAdmin — a real verified session (this reads
 * `auth.getUser()` directly rather than going through `requireUser()`,
 * because `requireUser()` calls `redirect()`, which throws a Next.js
 * `NEXT_REDIRECT` control-flow error that is the wrong "denied" shape for a
 * route handler to let escape), then `admin_users` via a service-role
 * client, decided by the same pure `isAdmin()`.
 *
 * Never throws and never returns a 5xx for an auth decision: every failure
 * path — no session, a signed-in non-admin, or any unexpected error while
 * establishing the session or reading `admin_users` — collapses to the same
 * 403 JSON response. This is deliberately fail-closed by construction: a
 * caught exception defaulting to "forbidden" is safe, a caught exception
 * defaulting to "allowed" (or an uncaught one producing an unhandled 500
 * that happens to skip the check) would not be. A genuine server
 * misconfiguration (missing `SUPABASE_SERVICE_ROLE_KEY`) is the one
 * exception — that's not an auth decision, it's why nothing works right
 * now, so it gets its own named 500 response per ENGINEERING.md §6, rather
 * than being folded into "forbidden."
 *
 * Call this at the top of every `/api/admin/**` handler and return the
 * guard immediately when it's a `NextResponse`. Only `user` is returned on
 * success (not the session client) — every consumer so far either just
 * needs the verified admin's id (for `admin_audit_log.actor_id`) or already
 * constructs its own service-role client, the same way this function and
 * `requireAdmin` do:
 *
 * ```ts
 * const guard = await requireAdminApi();
 * if (guard instanceof NextResponse) return guard;
 * const { user } = guard; // guard.user.id is the verified admin's id
 * ```
 */
export async function requireAdminApi(): Promise<RequireAdminApiResult> {
  const forbidden = () => NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!publicEnv.supabaseUrl || !privateEnv.serviceRole) {
    return NextResponse.json(
      { error: missingEnvMessage("SUPABASE_SERVICE_ROLE_KEY") },
      { status: 500 }
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return forbidden();

    const serviceRoleClient = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, {
      auth: { persistSession: false }
    });

    const row = await readAdminRow(serviceRoleClient, user.id);
    if (!isAdmin(row)) return forbidden();

    return { user };
  } catch {
    return forbidden();
  }
}
