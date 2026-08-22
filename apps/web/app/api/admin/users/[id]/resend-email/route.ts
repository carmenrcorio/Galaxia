import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { missingEnvMessage, publicEnv } from "../../../../../../lib/env";
import { privateEnv } from "../../../../../../lib/env.server";
import { requireAdminApi } from "../../../../../../lib/require-admin";
import { resendUserEmail } from "../../../../../../lib/admin/resend-email";
import { writeAdminAuditLog, type AdminAuditAction } from "../../../../../../lib/admin/audit-log";

// Talks to the Supabase Auth Admin API with the service-role key; Node runtime.
export const runtime = "nodejs";

const AUDIT_ACTION_BY_EMAIL_TYPE: Record<"confirmation" | "reset", AdminAuditAction> = {
  confirmation: "resend_confirmation_email",
  reset: "resend_password_reset_email"
};

/**
 * POST /api/admin/users/[id]/resend-email — one of Stage 2's two safe
 * actions. Calls requireAdminApi() itself (JSON 403), independent of the
 * `/admin` layout — same defense-in-depth requirement as every
 * `/api/admin/**` handler (see users/route.ts's own doc comment for why
 * the layout guard alone would not catch a direct hit here).
 *
 * Branches on the target's own `email_confirmed_at` via
 * `resendUserEmail` — an unconfirmed signup gets a real resend of the
 * confirmation email, a confirmed user gets a real password-reset email —
 * never one generic email regardless of state. No `profiles` write of any
 * kind; this only triggers an email.
 *
 * Writes exactly one `admin_audit_log` row via the shared
 * `writeAdminAuditLog`, in this same function, after the email send
 * succeeds: `actorId` is the guard's verified admin id (never anything
 * from the request), `action` is chosen from the closed vocabulary by the
 * email type actually sent, `targetUserId` is the target user, `metadata`
 * is `{ email_type }`. If the audit write itself fails, this responds 500
 * (not 200) — the email already went out and cannot be recalled, but the
 * response must not claim success for an unlogged privileged action.
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

  let emailType: "confirmation" | "reset";
  try {
    const result = await resendUserEmail(
      publicEnv.supabaseUrl,
      privateEnv.serviceRole,
      targetUserId,
      publicEnv.siteUrl ? `${publicEnv.siteUrl}/auth/callback` : undefined
    );
    emailType = result.emailType;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't send the email. Please try again.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const serviceRoleClient = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, {
    auth: { persistSession: false }
  });

  try {
    await writeAdminAuditLog(serviceRoleClient, {
      actorId: guard.user.id,
      action: AUDIT_ACTION_BY_EMAIL_TYPE[emailType],
      targetUserId,
      metadata: { email_type: emailType }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Audit log write failed.";
    return NextResponse.json(
      { error: `Email sent, but the audit log write failed: ${message}. Please tell an engineer.` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, emailType });
}
