import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * The admin user-list row shape — deliberately account-management fields
 * only. This must NEVER grow to include anything from `people` (birth data,
 * `is_minor`, `passed_at`, `relation`), `notes`, or Vela conversation
 * content: v1's load-bearing privacy boundary is that the admin manages
 * accounts, not relationship content. There is no "show this user's people"
 * view anywhere in the admin portal, and this type must stay the reason why.
 */
export interface AdminUserRow {
  id: string;
  email: string | null;
  display_name: string | null;
  subscription_status: string | null;
  comped: boolean;
  trial_ends_at: string | null;
  created_at: string | null;
  timezone: string | null;
  daily_nudge_emails_enabled: boolean;
}

export interface ListAdminUsersResult {
  users: AdminUserRow[];
  page: number;
  pageSize: number;
  /** Total across all pages, from the Admin API's pagination headers. */
  total: number;
  /**
   * True when a `search` was provided but ignored because it was shorter
   * than {@link MIN_SEARCH_LENGTH} — the same minimum GoTrue's own `filter`
   * query param enforces. The caller (route/page) surfaces this as a hint
   * rather than silently returning the unfiltered list with no explanation.
   */
  searchTooShort: boolean;
}

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 50;
const MIN_SEARCH_LENGTH = 3;

interface AuthUserLite {
  id: string;
  email?: string | null;
  created_at?: string | null;
}

interface ProfileRow {
  id: string;
  display_name: string | null;
  subscription_status: string | null;
  comped: boolean | null;
  trial_ends_at: string | null;
  created_at: string | null;
  timezone: string | null;
  daily_nudge_emails_enabled: boolean | null;
}

const PROFILE_FIELDS =
  "id, display_name, subscription_status, comped, trial_ends_at, created_at, timezone, daily_nudge_emails_enabled";

/**
 * Reads a page of users for the admin user list. ALWAYS uses a service-role
 * client constructed here from server-only env — this must never be called
 * with a user-session client, and never backs a client-side query. The
 * caller (the `/admin/users` server component and the `/api/admin/users`
 * route handler) is responsible for having already run `requireAdmin()` /
 * `requireAdminApi()` before calling this.
 *
 * `profiles` has no `email` column (email lives only on `auth.users`), so
 * this reads two sources and joins them by id: the Supabase Auth Admin API
 * for `email`/`created_at`/pagination, and `profiles` for every other
 * field. Ordering and pagination are driven by the Admin API's `listUsers`
 * (sorted `created_at desc` by default), never an unpaginated
 * `select("*")` against either table.
 */
export async function listAdminUsers(
  supabaseUrl: string,
  serviceRoleKey: string,
  {
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
    search
  }: { page?: number; pageSize?: number; search?: string } = {}
): Promise<ListAdminUsersResult> {
  const safePage = Math.max(1, Math.floor(page));
  const safePageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(pageSize)));
  const trimmedSearch = search?.trim() ?? "";
  const searchTooShort = trimmedSearch.length > 0 && trimmedSearch.length < MIN_SEARCH_LENGTH;

  const serviceRoleClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  const { users: authUsers, total } =
    trimmedSearch.length >= MIN_SEARCH_LENGTH
      ? await searchAuthUsersByEmail(supabaseUrl, serviceRoleKey, trimmedSearch, safePage, safePageSize)
      : await listAuthUsersPage(serviceRoleClient, safePage, safePageSize);

  if (authUsers.length === 0) {
    return { users: [], page: safePage, pageSize: safePageSize, total, searchTooShort };
  }

  const ids = authUsers.map((u) => u.id);
  const { data: profileRows } = await serviceRoleClient
    .from("profiles")
    .select(PROFILE_FIELDS)
    .in("id", ids);

  const profileById = new Map<string, ProfileRow>(
    ((profileRows ?? []) as ProfileRow[]).map((row) => [row.id, row])
  );

  const users: AdminUserRow[] = authUsers.map((authUser) => {
    const profile = profileById.get(authUser.id);
    return {
      id: authUser.id,
      email: authUser.email ?? null,
      display_name: profile?.display_name ?? null,
      subscription_status: profile?.subscription_status ?? null,
      comped: profile?.comped === true,
      trial_ends_at: profile?.trial_ends_at ?? null,
      created_at: profile?.created_at ?? authUser.created_at ?? null,
      timezone: profile?.timezone ?? null,
      // Column default is true (opt-out, default-on); no profile row yet or
      // a null value both read as "on" — same convention as the Settings
      // page's own read of this field.
      daily_nudge_emails_enabled: profile?.daily_nudge_emails_enabled !== false
    };
  });

  return { users, page: safePage, pageSize: safePageSize, total, searchTooShort };
}

async function listAuthUsersPage(
  serviceRoleClient: SupabaseClient,
  page: number,
  perPage: number
): Promise<{ users: AuthUserLite[]; total: number }> {
  const { data, error } = await serviceRoleClient.auth.admin.listUsers({ page, perPage });
  if (error) throw error;
  const total = "total" in data ? data.total : data.users.length;
  return { users: data.users, total };
}

/**
 * Targeted lookup by email via the Auth Admin REST endpoint's `filter`
 * query param — NOT a client-supplied `ilike` against an arbitrary column
 * (`profiles` has no email column to filter on anyway). The installed
 * `@supabase/supabase-js` version (2.108.2) does not yet expose `filter` on
 * its `listUsers()` wrapper, but the underlying GoTrue Admin API
 * (`GET /auth/v1/admin/users?filter=...`) has long supported it for
 * partial/full email matching — this calls that endpoint directly with the
 * same service-role credentials, rather than pulling every user and
 * filtering client-side.
 */
async function searchAuthUsersByEmail(
  supabaseUrl: string,
  serviceRoleKey: string,
  query: string,
  page: number,
  perPage: number
): Promise<{ users: AuthUserLite[]; total: number }> {
  const url = new URL(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/admin/users`);
  url.searchParams.set("filter", query);
  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", String(perPage));

  const res = await fetch(url.toString(), {
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
    cache: "no-store"
  });
  if (!res.ok) {
    throw new Error(`Admin user search failed (${res.status})`);
  }
  const body = (await res.json()) as { users?: AuthUserLite[] };
  const totalHeader = res.headers.get("x-total-count");
  const users = body.users ?? [];
  return { users, total: totalHeader ? Number(totalHeader) : users.length };
}
