import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { missingEnvMessage, publicEnv } from "../../../../../../lib/env";
import { privateEnv } from "../../../../../../lib/env.server";
import { requireAdminApi } from "../../../../../../lib/require-admin";
import { writeAdminAuditLog } from "../../../../../../lib/admin/audit-log";
import { getCampaignForAdmin, setCampaignStatus } from "../../../../../../lib/admin/emails";
import { CAMPAIGN_KIND } from "../../../../../../lib/email-kinds";
import { campaignRecipientVars, CAMPAIGN_SEND_CAP, listCampaignRecipients } from "../../../../../../lib/admin/campaign-send";
import { dispatchEmail, renderCopiedEmail, trialEmailHeaders } from "../../../../../../lib/emails";
import { emailOpenPixelUrl, newEmailTrackingId, recordEmailSend } from "../../../../../../lib/email-tracking";

export const runtime = "nodejs";
export const maxDuration = 800;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return guard;

  if (!publicEnv.supabaseUrl || !privateEnv.serviceRole) {
    return NextResponse.json({ error: missingEnvMessage("SUPABASE_SERVICE_ROLE_KEY") }, { status: 500 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { test?: unknown };
  const isTest = body.test === true;

  const serviceRoleClient = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, {
    auth: { persistSession: false }
  });
  const campaign = await getCampaignForAdmin(serviceRoleClient, id);
  if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  if (!isTest && (campaign.status === "sent" || campaign.status === "sending")) {
    return NextResponse.json({ error: "This campaign has already been sent." }, { status: 409 });
  }

  const siteUrl = publicEnv.siteUrl || "https://galaxiamea.com";
  const resendKey = process.env.RESEND_API_KEY ?? privateEnv.resendApiKey;

  if (isTest) {
    const to = guard.user.email;
    if (!to) return NextResponse.json({ error: "Your admin account has no email on file." }, { status: 400 });
    const trackingId = newEmailTrackingId();
    const rendered = renderCopiedEmail(campaign.copy, campaignRecipientVars({
      email: to,
      firstName: null,
      ownerId: guard.user.id,
      unsubscribeUrl: `${siteUrl}/api/campaign-email/unsubscribe`
    }), {
      siteUrl,
      unsubscribeUrl: `${siteUrl}/api/campaign-email/unsubscribe`,
      trackingUrl: emailOpenPixelUrl(siteUrl, trackingId),
      greeting: "Hi there,"
    });
    const result = await dispatchEmail(to, rendered, {
      headers: trialEmailHeaders(`${siteUrl}/api/campaign-email/unsubscribe`),
      tags: [{ name: "kind", value: CAMPAIGN_KIND }, { name: "test", value: "true" }],
      idempotencyKey: `campaign-test/${id}/${guard.user.id}/${new Date().toISOString().slice(0, 13)}`
    });
    if (!result.sent) {
      return NextResponse.json({ error: "Couldn't send the test. Check RESEND_API_KEY." }, { status: 503 });
    }
    await recordEmailSend(serviceRoleClient, {
      id: trackingId,
      kind: CAMPAIGN_KIND,
      campaignId: id,
      ownerId: guard.user.id,
      recipientEmail: to,
      resendId: result.id,
      subject: rendered.subject,
      isTest: true
    });
    try {
      await writeAdminAuditLog(serviceRoleClient, {
        actorId: guard.user.id,
        action: "send_email_test",
        metadata: { campaign_id: id }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Audit log write failed.";
      return NextResponse.json(
        { error: `Test sent, but the audit log write failed: ${message}. Please tell an engineer.` },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true, to, sent: 1, test: true });
  }

  await setCampaignStatus(serviceRoleClient, id, "sending");
  let recipients;
  try {
    recipients = await listCampaignRecipients(serviceRoleClient, campaign.audience, siteUrl, resendKey);
  } catch (err) {
    await setCampaignStatus(serviceRoleClient, id, "failed");
    const message = err instanceof Error ? err.message : "Couldn't load the audience.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (recipients.length === 0) {
    await setCampaignStatus(serviceRoleClient, id, "draft");
    return NextResponse.json({ error: "That audience is empty right now." }, { status: 400 });
  }
  if (recipients.length > CAMPAIGN_SEND_CAP) {
    await setCampaignStatus(serviceRoleClient, id, "draft");
    return NextResponse.json({
      error: `This audience has ${recipients.length} people. The send cap is ${CAMPAIGN_SEND_CAP}. Narrow it before sending.`
    }, { status: 400 });
  }

  let sent = 0;
  let failed = 0;
  for (const recipient of recipients) {
    const trackingId = newEmailTrackingId();
    const vars = campaignRecipientVars(recipient);
    const rendered = renderCopiedEmail(campaign.copy, vars, {
      siteUrl,
      unsubscribeUrl: recipient.unsubscribeUrl,
      trackingUrl: emailOpenPixelUrl(siteUrl, trackingId),
      greeting: vars.greeting
    });
    const result = await dispatchEmail(recipient.email, rendered, {
      headers: trialEmailHeaders(recipient.unsubscribeUrl),
      tags: [{ name: "kind", value: CAMPAIGN_KIND }, { name: "campaign", value: id }],
      idempotencyKey: `campaign/${id}/${recipient.email}`
    });
    if (!result.sent) {
      failed += 1;
      continue;
    }
    await recordEmailSend(serviceRoleClient, {
      id: trackingId,
      kind: CAMPAIGN_KIND,
      campaignId: id,
      ownerId: recipient.ownerId,
      recipientEmail: recipient.email,
      resendId: result.id,
      subject: rendered.subject,
      isTest: false
    });
    sent += 1;
  }

  const status = sent === 0 ? "failed" : "sent";
  await setCampaignStatus(serviceRoleClient, id, status, { sentAt: new Date().toISOString() });

  try {
    await writeAdminAuditLog(serviceRoleClient, {
      actorId: guard.user.id,
      action: "send_email_campaign",
      metadata: { campaign_id: id, sent, failed, audience: campaign.audience }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Audit log write failed.";
    return NextResponse.json(
      { error: `Campaign send finished (${sent} sent), but the audit log write failed: ${message}. Please tell an engineer.` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: status === "sent", sent, failed, evaluated: recipients.length });
}
