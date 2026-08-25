import Link from "next/link";
import { missingEnvMessage, publicEnv } from "../../../lib/env";
import { privateEnv } from "../../../lib/env.server";
import { listAdminUsers, DEFAULT_PAGE_SIZE, type AdminUserRow } from "../../../lib/admin/list-users";
import { statusPillInfo, compPillInfo } from "../../../lib/admin/status-pill";
import { StatusPill } from "../../../components/admin/status-pill";

/**
 * Read-only admin user list. This page renders behind admin/layout.tsx's
 * requireAdmin() call — no guard call here, by design (one call per
 * request, in the layout, per require-admin.ts's doc comment). The read
 * itself still goes through the same service-role path /api/admin/users
 * uses (listAdminUsers) rather than a client-side Supabase query — this is
 * a server component fetching directly, not a browser query against RLS.
 *
 * Narrowed to exactly 5 columns (v2 layout): Email, Status, Comped,
 * Created, and a trailing "View" affordance that links to
 * /admin/users/[id]. Name, Trial ends, Timezone, Nudge emails, and the
 * per-row action buttons (resend email / comp grant-revoke) moved to that
 * detail page — this list is a directory, not a control panel.
 *
 * The list itself still reads only account-management fields (via
 * `AdminUserRow` — see that type's own doc comment for the load-bearing
 * exclusion this must never grow past). Nothing from `people`, `notes`, or
 * Vela — there is no per-user "view their people" link here or anywhere
 * else in the admin portal, and it must stay that way.
 */
export default async function AdminUsersPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const search = params.q?.trim() ?? "";

  if (!publicEnv.supabaseUrl || !privateEnv.serviceRole) {
    return (
      <section className="glass-card">
        <h1 className="page-title" style={{ fontSize: "1.6rem" }}>Users</h1>
        <p className="error">{missingEnvMessage("SUPABASE_SERVICE_ROLE_KEY")}</p>
      </section>
    );
  }

  let result;
  let loadError: string | null = null;
  try {
    result = await listAdminUsers(publicEnv.supabaseUrl, privateEnv.serviceRole, {
      page,
      pageSize: DEFAULT_PAGE_SIZE,
      search
    });
  } catch {
    loadError = "Couldn't load users. Please try again.";
  }

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <div>
        <p className="eyebrow">Admin</p>
        <h1 className="page-title" style={{ fontSize: "1.9rem" }}>Users</h1>
      </div>

      <form method="GET" className="admin-search-form">
        <input
          type="search"
          name="q"
          defaultValue={search}
          placeholder="Search by email (3+ characters)…"
          className="field"
          style={{ maxWidth: 360 }}
        />
        <button type="submit" className="pill-link">
          Search
        </button>
        {search ? (
          <Link href="/admin/users" className="pill-link">
            Clear
          </Link>
        ) : null}
      </form>

      {loadError ? <p className="error">{loadError}</p> : null}

      {result && result.searchTooShort ? (
        <p className="muted">Type at least 3 characters to search by email.</p>
      ) : null}

      {result ? (
        <>
          <div className="glass-card">
            <table className="admin-table admin-table--fixed admin-table--rows-clickable">
              <colgroup>
                <col style={{ width: "42%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "12%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Comped</th>
                  <th>Created</th>
                  <th aria-hidden="true"></th>
                </tr>
              </thead>
              <tbody>
                {result.users.length === 0 ? (
                  <tr className="admin-table-row--empty">
                    <td colSpan={5} className="muted">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  result.users.map((user: AdminUserRow) => {
                    const status = statusPillInfo(user.subscription_status);
                    const comp = compPillInfo(user.comped);
                    return (
                      <tr key={user.id}>
                        <td className="admin-table-email-cell">{user.email ?? "—"}</td>
                        <td>
                          <StatusPill label={status.label} variant={status.variant} />
                        </td>
                        <td>
                          <StatusPill label={comp.label} variant={comp.variant} />
                        </td>
                        <td>{formatDate(user.created_at)}</td>
                        <td>
                          <Link
                            href={`/admin/users/${user.id}`}
                            className="admin-row-link"
                            aria-label={`View ${user.email ?? "this user"}`}
                          >
                            View <span aria-hidden="true">→</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {page > 1 ? (
              // pageHref returns a computed string, not a literal route — same
              // `as never` escape used for dynamic hrefs elsewhere (app-nav.tsx)
              // under typedRoutes (next.config.mjs).
              <Link className="pill-link" href={pageHref(page - 1, search) as never}>
                ← Previous
              </Link>
            ) : null}
            <span className="muted" style={{ fontSize: 13 }}>
              Page {result.page} · {result.total} total user{result.total === 1 ? "" : "s"}
            </span>
            {result.users.length === result.pageSize && page * result.pageSize < result.total ? (
              <Link className="pill-link" href={pageHref(page + 1, search) as never}>
                Next →
              </Link>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
}

function pageHref(page: number, search: string): string {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (search) params.set("q", search);
  const qs = params.toString();
  return qs ? `/admin/users?${qs}` : "/admin/users";
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
