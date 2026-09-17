/**
 * First-party open tracking for Galaxia-sent mail. The pixel is a 1x1
 * GIF at /api/email/open?t=<uuid>. Matching rows live in email_sends.
 * No session. A missing id still returns the GIF so the route cannot be
 * used to probe whether a send exists.
 */

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export const EMAIL_TRACKING_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[4-9a-f][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isEmailTrackingId(value: string | null | undefined): value is string {
  return Boolean(value && EMAIL_TRACKING_ID_RE.test(value));
}

export function newEmailTrackingId(): string {
  return randomUUID();
}

export function emailOpenPixelUrl(siteUrl: string, trackingId: string): string {
  return `${siteUrl.replace(/\/$/, "")}/api/email/open?t=${trackingId}`;
}

export function trackingPixelHtml(url: string): string {
  const safe = url
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
  return `<img src="${safe}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;border:0" />`;
}

export interface RecordEmailSendInput {
  id: string;
  kind: string;
  campaignId?: string | null;
  ownerId?: string | null;
  recipientEmail: string;
  resendId?: string | null;
  subject: string;
  isTest?: boolean;
}

export async function recordEmailSend(
  serviceRoleClient: SupabaseClient,
  input: RecordEmailSendInput
): Promise<void> {
  const { error } = await serviceRoleClient.from("email_sends").insert({
    id: input.id,
    kind: input.kind,
    campaign_id: input.campaignId ?? null,
    owner_id: input.ownerId ?? null,
    recipient_email: input.recipientEmail,
    resend_id: input.resendId ?? null,
    subject: input.subject,
    is_test: input.isTest ?? false
  });
  if (error) {
    console.error("[email-sends] insert failed", error.message);
  }
}

export async function recordEmailOpenByTrackingId(
  serviceRoleClient: SupabaseClient,
  trackingId: string,
  now: Date = new Date()
): Promise<boolean> {
  const { data } = await serviceRoleClient
    .from("email_sends")
    .select("id, opened_at, open_count")
    .eq("id", trackingId)
    .maybeSingle();
  if (!data?.id) return false;
  const openedAt = (data.opened_at as string | null) ?? now.toISOString();
  await serviceRoleClient
    .from("email_sends")
    .update({ opened_at: openedAt, open_count: ((data.open_count as number | null) ?? 0) + 1 })
    .eq("id", trackingId);
  return true;
}

export async function recordEmailOpenByResendId(
  serviceRoleClient: SupabaseClient,
  resendId: string,
  now: Date = new Date()
): Promise<boolean> {
  const { data } = await serviceRoleClient
    .from("email_sends")
    .select("id, opened_at, open_count")
    .eq("resend_id", resendId)
    .maybeSingle();
  if (!data?.id) return false;
  const openedAt = (data.opened_at as string | null) ?? now.toISOString();
  await serviceRoleClient
    .from("email_sends")
    .update({ opened_at: openedAt, open_count: ((data.open_count as number | null) ?? 0) + 1 })
    .eq("id", data.id);
  return true;
}

export interface EmailSendCounts {
  sent: number;
  opened: number;
}

export async function countEmailSends(
  serviceRoleClient: SupabaseClient,
  kind: string,
  campaignId?: string | null
): Promise<EmailSendCounts> {
  let sentQuery = serviceRoleClient
    .from("email_sends")
    .select("id", { count: "exact", head: true })
    .eq("is_test", false);
  let openedQuery = serviceRoleClient
    .from("email_sends")
    .select("id", { count: "exact", head: true })
    .eq("is_test", false)
    .not("opened_at", "is", null);
  if (campaignId) {
    sentQuery = sentQuery.eq("campaign_id", campaignId);
    openedQuery = openedQuery.eq("campaign_id", campaignId);
  } else {
    sentQuery = sentQuery.eq("kind", kind);
    openedQuery = openedQuery.eq("kind", kind);
  }
  const [sent, opened] = await Promise.all([sentQuery, openedQuery]);
  return { sent: sent.count ?? 0, opened: opened.count ?? 0 };
}

export interface EmailSendListRow {
  id: string;
  kind: string;
  recipient_email: string;
  subject: string;
  sent_at: string;
  opened_at: string | null;
  open_count: number;
  is_test: boolean;
}

export async function listRecentEmailSends(
  serviceRoleClient: SupabaseClient,
  opts: { kind?: string; campaignId?: string; limit?: number }
): Promise<EmailSendListRow[]> {
  let query = serviceRoleClient
    .from("email_sends")
    .select("id, kind, recipient_email, subject, sent_at, opened_at, open_count, is_test")
    .order("sent_at", { ascending: false })
    .limit(opts.limit ?? 50);
  if (opts.campaignId) query = query.eq("campaign_id", opts.campaignId);
  else if (opts.kind) query = query.eq("kind", opts.kind);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as EmailSendListRow[];
}
