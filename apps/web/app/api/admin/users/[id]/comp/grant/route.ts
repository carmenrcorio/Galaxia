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
 * POST /api/admin/users/[id]/comp/grant — writes `profiles.comped = true`
 * and NOTHING else (LOCKED: no `subscription_status`/`trial_ends_at`
 * write, no lifetime representation — see the Phase 0 dump). Calls
 * requireAdminApi() itself (JSON 403), independent of the `/admin`
 * layout — same defense-in-depth requirement as every `/api/admin/**`
 * handler (see users/route.ts's own doc comment for why the layout guard
 * alone would not catch a direct hit here).
 *
 * Delegates the actual read-validate-write to `transitionComp`, which
 * refuses a self-grant, refuses a no-op (already-comped) grant, and
 * guards the write on the row's prior `comped` value so a concurrent
 * transition can't lost-update it.
 *
 * Writes exactly one `admin_audit_log` row via the shared
 * `writeAdminAuditLog`, in this same function, after the write succeeds:
 * `actorId` is the guard's verified admin id (never anything from the
 * request), `action` is the fixed `"grant_comp"`, `targetUserId` is the
 * target user, `metadata` is `{ resulting_access }` (from the shared
 * `hasAccess` precedence, not reimplemented here). If the audit write
 * itself fails, this responds 500 (not 200) — the grant already landed
 * and cannot be silently un-done, but the response must not claim success
 * for an unlogged privileged action, mirroring resend-email/route.ts.
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
    result = await transitionComp(serviceRoleClient, targetUserId, guard.user.id, "grant");
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
    const message = err instanceof Error ? err.message : "Couldn't grant comp access. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  try {
    await writeAdminAuditLog(serviceRoleClient, {
      actorId: guard.user.id,
      action: "grant_comp",
      targetUserId,
      metadata: { resulting_access: result.hasAccess }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Audit log write failed.";
    return NextResponse.json(
      { error: `Comp granted, but the audit log write failed: ${message}. Please tell an engineer.` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, comped: result.profile.comped, hasAccess: result.hasAccess });
}
