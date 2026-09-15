import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * One-row product adoption snapshot from `public.admin_adoption_metrics`.
 * Counts only: never a person name, email, note body, or Vela message.
 * The view is service-role SELECT only; callers must pass a service-role
 * client already gated by requireAdmin() in the /admin layout.
 */
export interface AdminAdoptionMetrics {
  total_accounts: number;
  new_accounts_this_week: number;
  active_accounts_this_week: number;
  accounts_with_person: number;
  total_people: number;
  people_added_this_week: number;
  avg_people_per_account: number;
  memorial_or_ancient_profiles: number;
  total_vela_conversations: number;
  vela_messages_this_week: number;
  compare_sessions: number;
  compare_sessions_this_week: number;
  total_groups: number;
  groups_with_3_plus_members: number;
  moments_logged: number;
  connect_invites_sent: number;
  connect_invites_accepted: number;
  blog_email_captures: number;
}

export const ADOPTION_METRIC_COLUMNS = [
  "total_accounts",
  "new_accounts_this_week",
  "active_accounts_this_week",
  "accounts_with_person",
  "total_people",
  "people_added_this_week",
  "avg_people_per_account",
  "memorial_or_ancient_profiles",
  "total_vela_conversations",
  "vela_messages_this_week",
  "compare_sessions",
  "compare_sessions_this_week",
  "total_groups",
  "groups_with_3_plus_members",
  "moments_logged",
  "connect_invites_sent",
  "connect_invites_accepted",
  "blog_email_captures"
] as const satisfies readonly (keyof AdminAdoptionMetrics)[];

const ADOPTION_METRIC_SELECT = ADOPTION_METRIC_COLUMNS.join(", ");

export type AdoptionValueFormat = "count" | "avg";

export interface AdoptionMetricRow {
  label: string;
  valueKey: keyof AdminAdoptionMetrics;
  weekKey?: keyof AdminAdoptionMetrics;
  format?: AdoptionValueFormat;
  /** Weekly-window metrics render the number in gold instead of a delta. */
  weekOnly?: boolean;
}

export interface AdoptionSection {
  title: string;
  rows: AdoptionMetricRow[];
}

export const ADOPTION_SECTIONS: AdoptionSection[] = [
  {
    title: "Accounts",
    rows: [
      { label: "Total accounts", valueKey: "total_accounts", weekKey: "new_accounts_this_week" },
      { label: "Active this week", valueKey: "active_accounts_this_week", weekOnly: true },
      { label: "Accounts with at least one person", valueKey: "accounts_with_person" }
    ]
  },
  {
    title: "Constellation",
    rows: [
      { label: "Total people added", valueKey: "total_people", weekKey: "people_added_this_week" },
      { label: "Avg people per account", valueKey: "avg_people_per_account", format: "avg" },
      { label: "Memorial / ancient profiles", valueKey: "memorial_or_ancient_profiles" }
    ]
  },
  {
    title: "Vela and Compare",
    rows: [
      { label: "Total Vela conversations", valueKey: "total_vela_conversations" },
      { label: "Vela messages sent this week", valueKey: "vela_messages_this_week", weekOnly: true },
      { label: "Compare sessions run", valueKey: "compare_sessions", weekKey: "compare_sessions_this_week" }
    ]
  },
  {
    title: "Groups",
    rows: [
      { label: "Total groups created", valueKey: "total_groups" },
      { label: "Groups with 3 or more members", valueKey: "groups_with_3_plus_members" }
    ]
  },
  {
    title: "Engagement",
    rows: [
      { label: "Moments logged", valueKey: "moments_logged" },
      { label: "Connect invites sent", valueKey: "connect_invites_sent" },
      { label: "Connect invites accepted", valueKey: "connect_invites_accepted" },
      { label: "Blog email captures", valueKey: "blog_email_captures" }
    ]
  }
];

export function toNonNegativeNumber(value: unknown, field: string): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`admin_adoption_metrics.${field} is not a usable number`);
  }
  return n;
}

export function parseAdminAdoptionMetrics(row: Record<string, unknown>): AdminAdoptionMetrics {
  const parsed = {} as AdminAdoptionMetrics;
  for (const field of ADOPTION_METRIC_COLUMNS) {
    parsed[field] = toNonNegativeNumber(row[field], field);
  }
  return parsed;
}

/**
 * Reads the one-row adoption view. ALWAYS uses a service-role client
 * passed in by the caller (the `/admin/analytics` server component). The
 * view is revoked from anon/authenticated, so a user-session client would
 * get a permission error, not an empty result.
 */
export async function readAdminAdoptionMetrics(
  serviceRoleClient: SupabaseClient
): Promise<AdminAdoptionMetrics> {
  const { data, error } = await serviceRoleClient
    .from("admin_adoption_metrics")
    .select(ADOPTION_METRIC_SELECT)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("admin_adoption_metrics returned no row");
  return parseAdminAdoptionMetrics(data as unknown as Record<string, unknown>);
}

export function formatCount(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function formatAvg(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatWeekDelta(n: number): string {
  return `+${formatCount(n)} this week`;
}

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatRefreshedAt(at: Date): string {
  const day = String(at.getUTCDate());
  const month = SHORT_MONTHS[at.getUTCMonth()];
  const year = at.getUTCFullYear();
  const hour = String(at.getUTCHours()).padStart(2, "0");
  const minute = String(at.getUTCMinutes()).padStart(2, "0");
  return `${day} ${month} ${year}, ${hour}:${minute} UTC`;
}
