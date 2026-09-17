import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { missingEnvMessage, publicEnv } from "../../../../../lib/env";
import { privateEnv } from "../../../../../lib/env.server";
import { requireAdminApi } from "../../../../../lib/require-admin";
import { writeAdminAuditLog } from "../../../../../lib/admin/audit-log";
import { getTemplateForAdmin, updateEmailTemplate } from "../../../../../lib/admin/emails";
import { validateEmailCopy, type EmailCopy } from "../../../../../lib/email-copy";
import { isEmailCtaPathKey, isEmailKind } from "../../../../../lib/email-kinds";
import { parseParagraphs } from "../../../../../lib/email-copy";

export const runtime = "nodejs";

function copyFromBody(body: Record<string, unknown>, existing: EmailCopy): EmailCopy {
  return {
    subject: typeof body.subject === "string" ? body.subject : existing.subject,
    preview: typeof body.preview === "string" ? body.preview : existing.preview,
    paragraphs: Array.isArray(body.paragraphs) ? parseParagraphs(body.paragraphs) : existing.paragraphs,
    ctaLabel: typeof body.ctaLabel === "string" ? body.ctaLabel : existing.ctaLabel,
    ctaPathKey: typeof body.ctaPathKey === "string" && isEmailCtaPathKey(body.ctaPathKey) ? body.ctaPathKey : existing.ctaPathKey,
    firstEmailLine: typeof body.firstEmailLine === "string" ? body.firstEmailLine : existing.firstEmailLine
  };
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ kind: string }> }) {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return guard;

  if (!publicEnv.supabaseUrl || !privateEnv.serviceRole) {
    return NextResponse.json({ error: missingEnvMessage("SUPABASE_SERVICE_ROLE_KEY") }, { status: 500 });
  }

  const { kind } = await params;
  if (!isEmailKind(kind)) {
    return NextResponse.json({ error: "Unknown email." }, { status: 404 });
  }

  const serviceRoleClient = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, {
    auth: { persistSession: false }
  });
  const existing = await getTemplateForAdmin(serviceRoleClient, kind);
  if (!existing) {
    return NextResponse.json({ error: "Couldn't load this email. Apply the email_templates migration first." }, { status: 503 });
  }
  if (existing.category === "system") {
    return NextResponse.json({ error: "Sign-in emails are edited in Supabase Auth, not here." }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Missing required fields." }, { status: 400 });

  const copy = copyFromBody(body, existing.copy);
  const issues = validateEmailCopy(kind, copy, existing.editableFields);
  if (issues.length > 0) {
    return NextResponse.json({ error: issues[0]!.message, issues }, { status: 400 });
  }

  const enabled = typeof body.enabled === "boolean" ? body.enabled : existing.enabled;
  const template = await updateEmailTemplate(serviceRoleClient, kind, { copy, enabled }, guard.user.id);

  try {
    await writeAdminAuditLog(serviceRoleClient, {
      actorId: guard.user.id,
      action: "update_email_template",
      metadata: { kind, enabled }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Audit log write failed.";
    return NextResponse.json(
      { error: `Email saved, but the audit log write failed: ${message}. Please tell an engineer.` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, template });
}
