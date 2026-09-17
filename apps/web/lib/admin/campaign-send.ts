/**
 * Resolve campaign audiences and send one-to-one via Resend so each
 * recipient gets a tracking pixel and an email_sends row. Pure helpers
 * stay here; the route owns requireAdminApi + audit.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveAccountName } from "@galaxia/core";
import { chartReadingUnsubscribeUrl } from "../chart-reading-unsubscribe";
import { ownerGreeting } from "../emails";
import { CAMPAIGN_SEND_CAP, type CampaignAudience } from "../email-kinds";

export { CAMPAIGN_SEND_CAP };

export interface CampaignRecipient {
  email: string;
  firstName: string | null;
  ownerId: string | null;
  unsubscribeUrl: string;
}

export async function listCampaignRecipients(
  serviceRoleClient: SupabaseClient,
  audience: CampaignAudience,
  siteUrl: string,
  resendKey: string | undefined
): Promise<CampaignRecipient[]> {
  const origin = siteUrl.replace(/\/$/, "");
  if (audience === "blog_chart_readings") {
    const { data, error } = await serviceRoleClient
      .from("blog_email_captures")
      .select("email")
      .is("unsubscribed_at", null)
      .order("submitted_at", { ascending: false });
    if (error) throw new Error(error.message);
    const seen = new Set<string>();
    const recipients: CampaignRecipient[] = [];
    for (const row of data ?? []) {
      const email = typeof row.email === "string" ? row.email.trim().toLowerCase() : "";
      if (!email || seen.has(email)) continue;
      seen.add(email);
      const unsubscribeUrl = resendKey
        ? chartReadingUnsubscribeUrl(origin, email, resendKey)
        : `${origin}/api/blog/chart-reading-unsubscribe`;
      recipients.push({ email, firstName: null, ownerId: null, unsubscribeUrl });
    }
    return recipients;
  }

  let query = serviceRoleClient
    .from("profiles")
    .select("id, display_name, unsubscribe_token, trial_emails_opted_out, daily_nudge_emails_enabled, weekly_constellation_letter_enabled, campaign_emails_opted_out");
  if (audience === "members_trial") query = query.eq("trial_emails_opted_out", false);
  if (audience === "members_nudge") query = query.eq("daily_nudge_emails_enabled", true);
  if (audience === "members_letter") query = query.eq("weekly_constellation_letter_enabled", true);
  query = query.eq("campaign_emails_opted_out", false);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const recipients: CampaignRecipient[] = [];
  for (const profile of data ?? []) {
    const { data: authUser } = await serviceRoleClient.auth.admin.getUserById(profile.id as string);
    const email = authUser?.user?.email;
    if (!email) continue;
    const { data: selfPerson } = await serviceRoleClient
      .from("people")
      .select("display_name")
      .eq("owner_id", profile.id)
      .eq("is_self", true)
      .maybeSingle();
    const { firstName } = resolveAccountName({
      profileDisplayName: (profile.display_name as string | null) ?? null,
      selfPersonName: (selfPerson?.display_name as string | null) ?? null,
      email
    });
    recipients.push({
      email,
      firstName,
      ownerId: profile.id as string,
      unsubscribeUrl: `${origin}/api/campaign-email/unsubscribe?token=${profile.unsubscribe_token}`
    });
  }
  return recipients;
}

export function campaignRecipientVars(recipient: CampaignRecipient): Record<string, string> {
  const greeting = ownerGreeting(recipient.firstName);
  return {
    greeting,
    firstName: (recipient.firstName ?? "").trim()
  };
}

export { ownerGreeting };
