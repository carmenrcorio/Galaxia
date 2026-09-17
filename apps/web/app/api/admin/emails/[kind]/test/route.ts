import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { resolveAccountName } from "@galaxia/core";
import { missingEnvMessage, publicEnv } from "../../../../../../lib/env";
import { privateEnv } from "../../../../../../lib/env.server";
import { requireAdminApi } from "../../../../../../lib/require-admin";
import { writeAdminAuditLog } from "../../../../../../lib/admin/audit-log";
import { getTemplateForAdmin } from "../../../../../../lib/admin/emails";
import { DEFAULT_EMAIL_COPY } from "../../../../../../lib/email-copy";
import { isAutomationEmailKind, isEmailKind } from "../../../../../../lib/email-kinds";
import {
  chartReadingEmail,
  constellationLetterEmail,
  dispatchEmail,
  renderTrialEmail,
  skyTodayEmail,
  trialEmailHeaders,
  type TrialEmailKind
} from "../../../../../../lib/emails";
import { emailOpenPixelUrl, newEmailTrackingId, recordEmailSend } from "../../../../../../lib/email-tracking";
import { chromeFromCopy } from "../../../../../../lib/email-templates";
import { buildChartReading } from "../../../../../../lib/chart-reading";

export const runtime = "nodejs";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ kind: string }> }) {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return guard;

  if (!publicEnv.supabaseUrl || !privateEnv.serviceRole) {
    return NextResponse.json({ error: missingEnvMessage("SUPABASE_SERVICE_ROLE_KEY") }, { status: 500 });
  }
  const to = guard.user.email;
  if (!to) return NextResponse.json({ error: "Your admin account has no email on file." }, { status: 400 });

  const { kind } = await params;
  if (!isEmailKind(kind) || !isAutomationEmailKind(kind)) {
    return NextResponse.json({ error: "This email cannot be sent as a test from here." }, { status: 400 });
  }

  const serviceRoleClient = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, {
    auth: { persistSession: false }
  });
  const template = await getTemplateForAdmin(serviceRoleClient, kind);
  const copy = template?.copy ?? DEFAULT_EMAIL_COPY[kind];
  const siteUrl = publicEnv.siteUrl || "https://galaxiamea.com";
  const { data: profile } = await serviceRoleClient
    .from("profiles")
    .select("display_name, unsubscribe_token")
    .eq("id", guard.user.id)
    .maybeSingle();
  const { data: selfPerson } = await serviceRoleClient
    .from("people")
    .select("display_name")
    .eq("owner_id", guard.user.id)
    .eq("is_self", true)
    .maybeSingle();
  const { firstName } = resolveAccountName({
    profileDisplayName: profile?.display_name ?? null,
    selfPersonName: selfPerson?.display_name ?? null,
    email: to
  });
  const unsubscribeToken = (profile?.unsubscribe_token as string | undefined) ?? "test";
  const trackingId = newEmailTrackingId();
  const trackingUrl = emailOpenPixelUrl(siteUrl, trackingId);
  const chrome = chromeFromCopy(copy);

  let rendered;
  let headers: Record<string, string> = {};
  if (kind.startsWith("trial.")) {
    const trialKind = kind.slice("trial.".length) as TrialEmailKind;
    const unsubscribeUrl = `${siteUrl}/api/unsubscribe?token=${unsubscribeToken}`;
    rendered = renderTrialEmail(
      trialKind,
      {
        firstName,
        personName: "Riley",
        peopleCount: 3,
        notesCount: 2,
        threadsCount: 1,
        groupsCount: 1,
        trialEndDate: "24 July",
        siteUrl,
        unsubscribeToken,
        trackingUrl
      },
      copy
    );
    headers = trialEmailHeaders(unsubscribeUrl);
  } else if (kind === "nudge.sky_today") {
    const unsubscribeUrl = `${siteUrl}/api/nudge-email/unsubscribe?token=${unsubscribeToken}`;
    rendered = skyTodayEmail({
      ownerFirstName: firstName,
      subjectPersonName: "Riley",
      copyResolved: "The daily note from the sky engine lands here.",
      siteUrl,
      unsubscribeUrl,
      isFirstEmail: true,
      trackingUrl,
      chrome
    });
    headers = trialEmailHeaders(unsubscribeUrl);
  } else if (kind === "letter.weekly") {
    const unsubscribeUrl = `${siteUrl}/api/constellation-letter/unsubscribe?token=${unsubscribeToken}`;
    rendered = constellationLetterEmail({
      ownerFirstName: firstName,
      opening: "This week's letter is about Riley. The rest of the circle is quiet.",
      portraits: [
        {
          dynamicSentence: "Riley's Moon is meeting Saturn this week.",
          intentionSentence: "One thing to try with Riley: name the weight out loud rather than trying to solve it."
        }
      ],
      personNames: ["Riley"],
      siteUrl,
      unsubscribeUrl,
      openPixelUrl: trackingUrl,
      clickUrl: `${siteUrl}/app`,
      chrome
    });
    headers = trialEmailHeaders(unsubscribeUrl);
  } else {
    const unsubscribeUrl = `${siteUrl}/api/blog/chart-reading-unsubscribe`;
    rendered = chartReadingEmail({
      reading: buildChartReading({ name: "Riley", month: 7, day: 15, year: 1987, birthPlace: "Austin" }),
      unsubscribeUrl,
      trackingUrl,
      chrome
    });
    headers = trialEmailHeaders(unsubscribeUrl);
  }

  const result = await dispatchEmail(to, rendered, {
    headers,
    tags: [
      { name: "kind", value: kind },
      { name: "test", value: "true" }
    ],
    idempotencyKey: `email-test/${kind}/${guard.user.id}/${new Date().toISOString().slice(0, 13)}`
  });
  if (!result.sent) {
    return NextResponse.json({ error: "Couldn't send the test. Check RESEND_API_KEY." }, { status: 503 });
  }

  await recordEmailSend(serviceRoleClient, {
    id: trackingId,
    kind,
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
      metadata: { kind }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Audit log write failed.";
    return NextResponse.json(
      { error: `Test sent, but the audit log write failed: ${message}. Please tell an engineer.` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, to });
}
