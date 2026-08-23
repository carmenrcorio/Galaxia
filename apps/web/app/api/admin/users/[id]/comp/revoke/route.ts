import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { missingEnvMessage, publicEnv } from "../../../../../../../lib/env";
import { privateEnv } from "../../../../../../../lib/env.server";
import { requireAdminApi } from "../../../../../../../lib/require-admin";
import {
  CompConflictError,
  CompTargetNotFoundError,
  SelfCompError,
  transitionComp
} from "../../../../../../../lib/admin/comp";
import { writeAdminAuditLog } from "../../../../../../../lib/admin/audit-log";

// Talks to profiles with the service-role key; Node runtime.
export const runtime = "nodejs";

/**
 * POST /api/admin/users/[id]/comp/revoke — writes `profiles.comped = false`
 * and NOTHING else (LOCKED: hard revoke, no grace, no
 * `subscription_status`/`trial_ends_at` write — see the Phase 0 dump).
 * Mirrors grant/route.ts exactly except for the transition direction and
 * the audit action; same defense-in-depth requireAdminApi() call
 * independent of the `/admin` layout.
 *
 * Delegates to `transitionComp`, which refuses a self-revoke, refuses a
 * no-op (already-not-comped) revoke, and guards the write on the row's
 * prior `comped` value so a concurrent transition can't lost-update it.
 * The resulting `hasAccess` in the response is the row's real
 * subscription_status/trial_ends_at run back through the one shared
 * `hasAccess` precedence — for an account whose only access was the
 * comp (e.g. a stale-trialing founder shape), this is `false` the instant
 * the write lands.
 *
 * Writes exactly one `admin_audit_log` row via the shared
 * `writeAdminAuditLog`, in this same function, after the write succeeds.
 * If the audit write itself fails, this responds 500 (not 200) — the
 * revoke already landed and cannot be silently un-done, but the response
 * must not claim success for an unlogged privileged action.
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return guard;

  if (!publicEnv.supabaseUrl || !privateEnv.serviceRole) {
    return NextResponse.json(
      { error: missingEnvMessage("SUPABASE_SERVICE_ROLE_KEY") },
      { status: 500 }
    );
  }

  const { id: targetUserId } = await params;
  if (!targetUserId) {
    return NextResponse.json({ error: "Missing user id." }, { status: 400 });
  }

  const serviceRoleClient = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, {
    auth: { persistSession: false }
  });

  let result;
  try {
    result = await transitionComp(serviceRoleClient, targetUserId, guard.user.id, "revoke");
  } catch (err) {
    if (err instanceof SelfCompError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err instanceof CompTargetNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof CompConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    const message = err instanceof Error ? err.message : "Couldn't revoke comp access. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  try {
    await writeAdminAuditLog(serviceRoleClient, {
      actorId: guard.user.id,
      action: "revoke_comp",
      targetUserId,
      metadata: { resulting_access: result.hasAccess }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Audit log write failed.";
    return NextResponse.json(
      { error: `Comp revoked, but the audit log write failed: ${message}. Please tell an engineer.` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, comped: result.profile.comped, hasAccess: result.hasAccess });
}
