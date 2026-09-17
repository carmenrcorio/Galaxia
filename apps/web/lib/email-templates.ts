/**
 * Load email_templates rows via an already-constructed service-role client.
 * Missing table (migration not applied) returns null so crons keep using
 * the shipped copy in email-copy.ts instead of failing the run.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { EmailCopy } from "./email-copy";
import { DEFAULT_EMAIL_COPY, parseParagraphs } from "./email-copy";
import {
  type AutomationEmailKind,
  type EmailCtaPathKey,
  type EmailEditableField,
  type EmailKind,
  isAutomationEmailKind,
  isEmailCtaPathKey,
  isEmailEditableField,
  isEmailKind
} from "./email-kinds";

export interface EmailTemplateRow {
  kind: EmailKind;
  name: string;
  description: string;
  triggerLabel: string;
  category: "automation" | "system";
  enabled: boolean;
  editableFields: EmailEditableField[];
  copy: EmailCopy;
  updatedAt: string;
  updatedBy: string | null;
}

const TEMPLATE_FIELDS =
  "kind, name, description, trigger_label, category, enabled, editable_fields, subject, preview, paragraphs, cta_label, cta_path_key, first_email_line, updated_at, updated_by";

function mapRow(row: Record<string, unknown>): EmailTemplateRow | null {
  const kind = typeof row.kind === "string" && isEmailKind(row.kind) ? row.kind : null;
  if (!kind) return null;
  const editableFields = Array.isArray(row.editable_fields)
    ? row.editable_fields.filter((item): item is EmailEditableField => typeof item === "string" && isEmailEditableField(item))
    : [];
  const ctaPathKey =
    typeof row.cta_path_key === "string" && isEmailCtaPathKey(row.cta_path_key) ? row.cta_path_key : null;
  return {
    kind,
    name: String(row.name ?? kind),
    description: String(row.description ?? ""),
    triggerLabel: String(row.trigger_label ?? ""),
    category: row.category === "system" ? "system" : "automation",
    enabled: row.enabled !== false,
    editableFields,
    copy: {
      subject: String(row.subject ?? ""),
      preview: String(row.preview ?? ""),
      paragraphs: parseParagraphs(row.paragraphs),
      ctaLabel: typeof row.cta_label === "string" ? row.cta_label : null,
      ctaPathKey,
      firstEmailLine: typeof row.first_email_line === "string" ? row.first_email_line : null
    },
    updatedAt: String(row.updated_at ?? ""),
    updatedBy: typeof row.updated_by === "string" ? row.updated_by : null
  };
}

export async function listEmailTemplates(
  serviceRoleClient: SupabaseClient
): Promise<EmailTemplateRow[] | null> {
  const { data, error } = await serviceRoleClient.from("email_templates").select(TEMPLATE_FIELDS);
  if (error) return null;
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>)).filter((row): row is EmailTemplateRow => Boolean(row));
}

export async function getEmailTemplate(
  serviceRoleClient: SupabaseClient,
  kind: EmailKind
): Promise<EmailTemplateRow | null> {
  const { data, error } = await serviceRoleClient
    .from("email_templates")
    .select(TEMPLATE_FIELDS)
    .eq("kind", kind)
    .maybeSingle();
  if (error || !data) return null;
  return mapRow(data as Record<string, unknown>);
}

export async function loadAutomationCopy(
  serviceRoleClient: SupabaseClient,
  kind: AutomationEmailKind
): Promise<{ enabled: boolean; copy: EmailCopy }> {
  const row = await getEmailTemplate(serviceRoleClient, kind);
  if (!row) return { enabled: true, copy: DEFAULT_EMAIL_COPY[kind] };
  return { enabled: row.enabled, copy: row.copy };
}

export async function loadEnabledMap(
  serviceRoleClient: SupabaseClient
): Promise<Map<string, boolean> | null> {
  const rows = await listEmailTemplates(serviceRoleClient);
  if (!rows) return null;
  return new Map(rows.map((row) => [row.kind, row.enabled]));
}

export function shippedCopyForKind(kind: string): EmailCopy | null {
  if (!isAutomationEmailKind(kind)) return null;
  return DEFAULT_EMAIL_COPY[kind];
}

export type EmailTemplateWrite = {
  enabled?: boolean;
  copy: EmailCopy;
};

export async function updateEmailTemplate(
  serviceRoleClient: SupabaseClient,
  kind: EmailKind,
  write: EmailTemplateWrite,
  actorId: string
): Promise<EmailTemplateRow> {
  const patch: Record<string, unknown> = {
    subject: write.copy.subject,
    preview: write.copy.preview,
    paragraphs: write.copy.paragraphs,
    cta_label: write.copy.ctaLabel,
    cta_path_key: write.copy.ctaPathKey,
    first_email_line: write.copy.firstEmailLine,
    updated_at: new Date().toISOString(),
    updated_by: actorId
  };
  if (typeof write.enabled === "boolean") patch.enabled = write.enabled;
  const { data, error } = await serviceRoleClient
    .from("email_templates")
    .update(patch)
    .eq("kind", kind)
    .select(TEMPLATE_FIELDS)
    .single();
  if (error || !data) throw new Error(error?.message ?? "Couldn't save this email.");
  const mapped = mapRow(data as Record<string, unknown>);
  if (!mapped) throw new Error("Couldn't save this email.");
  return mapped;
}

export function chromeFromCopy(copy: EmailCopy): Pick<EmailCopy, "preview" | "ctaLabel" | "firstEmailLine"> {
  return {
    preview: copy.preview,
    ctaLabel: copy.ctaLabel,
    firstEmailLine: copy.firstEmailLine
  };
}

export type { EmailCtaPathKey };
