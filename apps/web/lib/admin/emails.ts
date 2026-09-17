/**
 * Admin read/write for email_templates, email_campaigns, and send stats.
 * Takes an already-constructed service-role client. Callers must have
 * already run requireAdmin / requireAdminApi.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { EmailCopy } from "../email-copy";
import { parseParagraphs } from "../email-copy";
import {
  type CampaignAudience,
  type CampaignStatus,
  CAMPAIGN_KIND,
  isCampaignAudience,
  isEmailKind
} from "../email-kinds";
import { countEmailSends, listRecentEmailSends, type EmailSendCounts, type EmailSendListRow } from "../email-tracking";
import { getEmailTemplate, listEmailTemplates, updateEmailTemplate, type EmailTemplateRow } from "../email-templates";

export type { EmailTemplateRow, EmailSendCounts, EmailSendListRow };

export async function listTemplatesForAdmin(serviceRoleClient: SupabaseClient): Promise<EmailTemplateRow[]> {
  const rows = await listEmailTemplates(serviceRoleClient);
  if (!rows) throw new Error("Couldn't load emails. The email_templates table may not be applied yet.");
  const order = [
    "trial.day1",
    "trial.day4_one",
    "trial.day4_multi",
    "trial.day11",
    "trial.day14",
    "nudge.sky_today",
    "letter.weekly",
    "chart.reading",
    "auth.signup",
    "auth.magic_link",
    "auth.recovery"
  ];
  return [...rows].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
}

export async function getTemplateForAdmin(
  serviceRoleClient: SupabaseClient,
  kind: string
): Promise<EmailTemplateRow | null> {
  if (!isEmailKind(kind)) return null;
  return getEmailTemplate(serviceRoleClient, kind);
}

export { updateEmailTemplate };

export interface AdminCampaign {
  id: string;
  name: string;
  status: CampaignStatus;
  audience: CampaignAudience;
  copy: EmailCopy;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const CAMPAIGN_FIELDS =
  "id, name, status, audience, subject, preview, paragraphs, cta_label, cta_path_key, sent_at, created_at, updated_at";

function mapCampaign(row: Record<string, unknown>): AdminCampaign {
  const audience = typeof row.audience === "string" && isCampaignAudience(row.audience) ? row.audience : "blog_chart_readings";
  const status = (typeof row.status === "string" ? row.status : "draft") as CampaignStatus;
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    status,
    audience,
    copy: {
      subject: String(row.subject ?? ""),
      preview: String(row.preview ?? ""),
      paragraphs: parseParagraphs(row.paragraphs),
      ctaLabel: typeof row.cta_label === "string" ? row.cta_label : null,
      ctaPathKey:
        typeof row.cta_path_key === "string" && ["welcome", "compare", "subscribe", "app"].includes(row.cta_path_key)
          ? (row.cta_path_key as EmailCopy["ctaPathKey"])
          : null,
      firstEmailLine: null
    },
    sentAt: typeof row.sent_at === "string" ? row.sent_at : null,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? "")
  };
}

export async function listCampaignsForAdmin(serviceRoleClient: SupabaseClient): Promise<AdminCampaign[]> {
  const { data, error } = await serviceRoleClient
    .from("email_campaigns")
    .select(CAMPAIGN_FIELDS)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapCampaign(row as Record<string, unknown>));
}

export async function getCampaignForAdmin(
  serviceRoleClient: SupabaseClient,
  id: string
): Promise<AdminCampaign | null> {
  const { data, error } = await serviceRoleClient
    .from("email_campaigns")
    .select(CAMPAIGN_FIELDS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapCampaign(data as Record<string, unknown>);
}

export interface CampaignInput {
  name: string;
  audience: CampaignAudience;
  copy: EmailCopy;
  status?: CampaignStatus;
}

function campaignWrite(input: CampaignInput): Record<string, unknown> {
  const name = input.name.trim();
  if (!name) throw new Error("Name is required.");
  return {
    name,
    audience: input.audience,
    subject: input.copy.subject,
    preview: input.copy.preview,
    paragraphs: input.copy.paragraphs,
    cta_label: input.copy.ctaLabel,
    cta_path_key: input.copy.ctaPathKey,
    updated_at: new Date().toISOString()
  };
}

export async function createCampaign(
  serviceRoleClient: SupabaseClient,
  input: CampaignInput,
  actorId: string
): Promise<AdminCampaign> {
  const { data, error } = await serviceRoleClient
    .from("email_campaigns")
    .insert({
      ...campaignWrite(input),
      status: input.status ?? "draft",
      created_by: actorId
    })
    .select(CAMPAIGN_FIELDS)
    .single();
  if (error || !data) throw new Error(error?.message ?? "Couldn't create the campaign.");
  return mapCampaign(data as Record<string, unknown>);
}

export async function updateCampaign(
  serviceRoleClient: SupabaseClient,
  id: string,
  input: CampaignInput
): Promise<AdminCampaign> {
  const existing = await getCampaignForAdmin(serviceRoleClient, id);
  if (!existing) throw new Error("Campaign not found.");
  if (existing.status === "sent" || existing.status === "sending") {
    throw new Error("A sent campaign cannot be edited. Duplicate it into a draft.");
  }
  const { data, error } = await serviceRoleClient
    .from("email_campaigns")
    .update(campaignWrite(input))
    .eq("id", id)
    .select(CAMPAIGN_FIELDS)
    .single();
  if (error || !data) throw new Error(error?.message ?? "Couldn't save the campaign.");
  return mapCampaign(data as Record<string, unknown>);
}

export async function setCampaignStatus(
  serviceRoleClient: SupabaseClient,
  id: string,
  status: CampaignStatus,
  extra?: { sentAt?: string }
): Promise<AdminCampaign> {
  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (extra?.sentAt) patch.sent_at = extra.sentAt;
  const { data, error } = await serviceRoleClient
    .from("email_campaigns")
    .update(patch)
    .eq("id", id)
    .select(CAMPAIGN_FIELDS)
    .single();
  if (error || !data) throw new Error(error?.message ?? "Couldn't update the campaign.");
  return mapCampaign(data as Record<string, unknown>);
}

export { CAMPAIGN_KIND, countEmailSends, listRecentEmailSends };

export function openRateLabel(sent: number, opened: number): string {
  if (sent <= 0) return "none yet";
  const pct = Math.round((opened / sent) * 100);
  return `${opened} of ${sent} (${pct}%)`;
}

export function formatEmailTimestamp(iso: string | null | undefined): string {
  if (!iso) return "none";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "none";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
