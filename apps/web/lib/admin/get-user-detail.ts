import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * The single-user detail row for `/admin/users/[id]`. Extends
 * `AdminUserRow`'s (list-users.ts) account-management field set with the
 * additional currently-unused `profiles` columns the approved detail-page
 * layout calls for: `subscription_tier`, `plan`, `cancel_at_period_end`,
 * `current_period_end`, `house_system`, `stripe_customer_id`,
 * `stripe_subscription_id`.
 *
 * Same load-bearing exclusion `AdminUserRow` documents for itself: this
 * must NEVER grow to include anything from `people` (birth data, `is_minor`,
 * `passed_at`, `relation`), `notes`, or Vela conversation content. The
 * detail page is an account-management surface only — there is no "show
 * this user's people" view here or anywhere else in the admin portal, and
 * this type must stay the reason why.
 */
export interface AdminUserDetail {
  id: string;
  email: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  display_name: string | null;
  subscription_status: string | null;
  comped: boolean;
  trial_ends_at: string | null;
  timezone: string | null;
  daily_nudge_emails_enabled: boolean;
  subscription_tier: string | null;
  plan: string | null;
  cancel_at_period_end: boolean;
  current_period_end: string | null;
  house_system: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

interface DetailProfileRow {
  id: string;
  display_name: string | null;
  subscription_status: string | null;
  comped: boolean | null;
  trial_ends_at: string | null;
  created_at: string | null;
  timezone: string | null;
  daily_nudge_emails_enabled: boolean | null;
  subscription_tier: string | null;
  plan: string | null;
  cancel_at_period_end: boolean | null;
  current_period_end: string | null;
  house_system: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

// A single string literal (not a `+`-concatenation) — Supabase's typed
// query builder parses `select(...)`'s argument at the type level to infer
// the result row shape, which only works against a literal string type;
// concatenating pieces widens the const to plain `string` and the builder
// falls back to an unhelpful `GenericStringError` result type.
const DETAIL_PROFILE_FIELDS =
  "id, display_name, subscription_status, comped, trial_ends_at, created_at, timezone, daily_nudge_emails_enabled, subscription_tier, plan, cancel_at_period_end, current_period_end, house_system, stripe_customer_id, stripe_subscription_id";

/**
 * Reads one user for the admin detail page: joins the Supabase Auth Admin
 * API (`id`, `email`, `created_at`, `last_sign_in_at`, `email_confirmed_at`)
 * with the full `profiles` field set above, by id — same two-source join
 * `listAdminUsers` uses (`profiles` has no `email` column). Returns `null`
 * when the id does not resolve to a real auth user, so the caller (the
 * `/admin/users/[id]` server component) can render a clean not-found state
 * instead of throwing.
 *
 * ALWAYS uses a service-role client constructed here from server-only env
 * — this must never be called with a user-session client. The caller is
 * responsible for having already run `requireAdmin()` (via the `/admin`
 * layout) before calling this.
 */
export async function getAdminUserDetail(
  supabaseUrl: string,
  serviceRoleKey: string,
  userId: string
): Promise<AdminUserDetail | null> {
  const serviceRoleClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  const { data: authData, error: authError } = await serviceRoleClient.auth.admin.getUserById(userId);
  if (authError || !authData?.user) {
    return null;
  }
  const authUser = authData.user;

  const { data: profileRow } = await serviceRoleClient
    .from("profiles")
    .select(DETAIL_PROFILE_FIELDS)
    .eq("id", userId)
    .maybeSingle();
  const profile = (profileRow ?? null) as DetailProfileRow | null;

  return {
    id: authUser.id,
    email: authUser.email ?? null,
    created_at: profile?.created_at ?? authUser.created_at ?? null,
    last_sign_in_at: authUser.last_sign_in_at ?? null,
    email_confirmed_at: authUser.email_confirmed_at ?? null,
    display_name: profile?.display_name ?? null,
    subscription_status: profile?.subscription_status ?? null,
    comped: profile?.comped === true,
    trial_ends_at: profile?.trial_ends_at ?? null,
    timezone: profile?.timezone ?? null,
    // Column default is true (opt-out, default-on); no profile row yet or a
    // null value both read as "on" — same convention listAdminUsers uses.
    daily_nudge_emails_enabled: profile?.daily_nudge_emails_enabled !== false,
    subscription_tier: profile?.subscription_tier ?? null,
    plan: profile?.plan ?? null,
    cancel_at_period_end: profile?.cancel_at_period_end === true,
    current_period_end: profile?.current_period_end ?? null,
    house_system: profile?.house_system ?? null,
    stripe_customer_id: profile?.stripe_customer_id ?? null,
    stripe_subscription_id: profile?.stripe_subscription_id ?? null
  };
}
