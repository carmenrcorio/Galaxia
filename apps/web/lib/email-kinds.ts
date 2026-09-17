/**
 * Closed vocabulary for Galaxia-sent email kinds, CTA allowlist, and
 * campaign audiences. Admin editors and crons import this instead of
 * restating the lists inline.
 */

import { EMAIL_PATHS } from "./nav-links";

export const EMAIL_CTA_PATH_KEYS = ["welcome", "compare", "subscribe", "app"] as const;
export type EmailCtaPathKey = (typeof EMAIL_CTA_PATH_KEYS)[number];

export function isEmailCtaPathKey(value: string | null | undefined): value is EmailCtaPathKey {
  return Boolean(value && (EMAIL_CTA_PATH_KEYS as readonly string[]).includes(value));
}

export function emailCtaHref(siteUrl: string, key: EmailCtaPathKey): string {
  return `${siteUrl.replace(/\/$/, "")}${EMAIL_PATHS[key]}`;
}

export const EMAIL_CATEGORIES = ["automation", "system"] as const;
export type EmailCategory = (typeof EMAIL_CATEGORIES)[number];

export const AUTOMATION_EMAIL_KINDS = [
  "trial.day1",
  "trial.day4_one",
  "trial.day4_multi",
  "trial.day11",
  "trial.day14",
  "nudge.sky_today",
  "letter.weekly",
  "chart.reading"
] as const;
export type AutomationEmailKind = (typeof AUTOMATION_EMAIL_KINDS)[number];

export const SYSTEM_EMAIL_KINDS = ["auth.signup", "auth.magic_link", "auth.recovery"] as const;
export type SystemEmailKind = (typeof SYSTEM_EMAIL_KINDS)[number];

export const EMAIL_KINDS = [...AUTOMATION_EMAIL_KINDS, ...SYSTEM_EMAIL_KINDS] as const;
export type EmailKind = (typeof EMAIL_KINDS)[number];

export function isEmailKind(value: string): value is EmailKind {
  return (EMAIL_KINDS as readonly string[]).includes(value);
}

export function isAutomationEmailKind(value: string): value is AutomationEmailKind {
  return (AUTOMATION_EMAIL_KINDS as readonly string[]).includes(value);
}

export const CAMPAIGN_AUDIENCES = [
  "blog_chart_readings",
  "members_trial",
  "members_nudge",
  "members_letter"
] as const;
export type CampaignAudience = (typeof CAMPAIGN_AUDIENCES)[number];

export function isCampaignAudience(value: string): value is CampaignAudience {
  return (CAMPAIGN_AUDIENCES as readonly string[]).includes(value);
}

export const CAMPAIGN_STATUSES = ["draft", "sending", "sent", "canceled", "failed"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const EMAIL_EDITABLE_FIELDS = [
  "subject",
  "preview",
  "paragraphs",
  "cta_label",
  "cta_path_key",
  "first_email_line"
] as const;
export type EmailEditableField = (typeof EMAIL_EDITABLE_FIELDS)[number];

export function isEmailEditableField(value: string): value is EmailEditableField {
  return (EMAIL_EDITABLE_FIELDS as readonly string[]).includes(value);
}

export const CAMPAIGN_KIND = "campaign";

export const CAMPAIGN_SEND_CAP = 500;

export function trialKindToEmailKind(kind: TrialEmailKind): AutomationEmailKind {
  return `trial.${kind}`;
}

export type TrialEmailKind = "day1" | "day4_one" | "day4_multi" | "day11" | "day14";

export const CAMPAIGN_AUDIENCE_LABELS: Record<CampaignAudience, string> = {
  blog_chart_readings: "Blog chart readings",
  members_trial: "Members who still get trial emails",
  members_nudge: "Members who still get the daily sky email",
  members_letter: "Members who still get the weekly letter"
};

export const EMAIL_CTA_PATH_LABELS: Record<EmailCtaPathKey, string> = {
  welcome: "Add a person (/welcome)",
  compare: "Compare (/compare)",
  subscribe: "Continue (/subscribe)",
  app: "Open Galaxia (/app)"
};
