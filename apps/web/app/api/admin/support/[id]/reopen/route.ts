import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { missingEnvMessage, publicEnv } from "../../../../../../lib/env";
import { privateEnv } from "../../../../../../lib/env.server";
import { requireAdminApi } from "../../../../../../lib/require-admin";
import {
  SupportRequestConflictError,
  SupportRequestNotFoundError,
  transitionSupportRequest
} from "../../../../../../lib/admin/support-requests";
import { writeAdminAuditLog } from "../../../../../../lib/admin/audit-log";

export const runtime = "nodejs";

/**
 * POST /api/admin/support/[id]/reopen — calls requireAdminApi() itself
 * (JSON 403), independent of the `/admin` layout, same as every
 * `/api/admin/**` handler. Mirrors close/route.ts exactly except for the
 * transition direction and the audit action.
 *
 * Sets status='open' + a fresh handled_by + handled_at via
 * `transitionSupportRequest`, then writes exactly one
 * `reopen_support_request` audit row (target = the request's owner) via
 * the shared `writeAdminAuditLog`, in this same function. If the audit
 * write fails after a successful transition, this responds 500 rather
 * than 200, for the same reason close/route.ts does.
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

  const { id: requestId } = await params;
  if (!requestId) {
    return NextResponse.json({ error: "Missing support request id." }, { status: 400 });
  }

  const serviceRoleClient = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, {
    auth: { persistSession: false }
  });

  let updated;
  try {
    updated = await transitionSupportRequest(serviceRoleClient, requestId, guard.user.id, "reopen");
  } catch (err) {
    if (err instanceof SupportRequestNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof SupportRequestConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    const message = err instanceof Error ? err.message : "Couldn't reopen this request. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  try {
    await writeAdminAuditLog(serviceRoleClient, {
      actorId: guard.user.id,
      action: "reopen_support_request",
      targetUserId: updated.owner_id,
      metadata: { support_request_id: requestId }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Audit log write failed.";
    return NextResponse.json(
      { error: `Request reopened, but the audit log write failed: ${message}. Please tell an engineer.` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, supportRequest: updated });
}
