import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { missingEnvMessage, publicEnv } from "../../../../../lib/env";
import { privateEnv } from "../../../../../lib/env.server";
import { requireAdminApi } from "../../../../../lib/require-admin";
import { writeAdminAuditLog } from "../../../../../lib/admin/audit-log";
import { getCampaignForAdmin, updateCampaign } from "../../../../../lib/admin/emails";
import { parseParagraphs, validateCampaignCopy, type EmailCopy } from "../../../../../lib/email-copy";
import { isCampaignAudience, isEmailCtaPathKey } from "../../../../../lib/email-kinds";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return guard;

  if (!publicEnv.supabaseUrl || !privateEnv.serviceRole) {
    return NextResponse.json({ error: missingEnvMessage("SUPABASE_SERVICE_ROLE_KEY") }, { status: 500 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.name !== "string") {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }
  if (typeof body.audience !== "string" || !isCampaignAudience(body.audience)) {
    return NextResponse.json({ error: "Choose an audience." }, { status: 400 });
  }

  const copy: EmailCopy = {
    subject: typeof body.subject === "string" ? body.subject : "",
    preview: typeof body.preview === "string" ? body.preview : "",
    paragraphs: parseParagraphs(body.paragraphs),
    ctaLabel: typeof body.ctaLabel === "string" ? body.ctaLabel : null,
    ctaPathKey: typeof body.ctaPathKey === "string" && isEmailCtaPathKey(body.ctaPathKey) ? body.ctaPathKey : null,
    firstEmailLine: null
  };
  const issues = validateCampaignCopy(copy);
  if (issues.length > 0) {
    return NextResponse.json({ error: issues[0]!.message, issues }, { status: 400 });
  }

  const serviceRoleClient = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, {
    auth: { persistSession: false }
  });

  const existing = await getCampaignForAdmin(serviceRoleClient, id);
  if (!existing) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });

  let campaign;
  try {
    campaign = await updateCampaign(serviceRoleClient, id, { name: body.name, audience: body.audience, copy });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't save the campaign.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    await writeAdminAuditLog(serviceRoleClient, {
      actorId: guard.user.id,
      action: "update_email_campaign",
      metadata: { campaign_id: id }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Audit log write failed.";
    return NextResponse.json(
      { error: `Campaign saved, but the audit log write failed: ${message}. Please tell an engineer.` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, campaign });
}
