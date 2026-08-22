import { createClient } from "@supabase/supabase-js";
import { missingEnvMessage, publicEnv } from "../../../lib/env";
import { privateEnv } from "../../../lib/env.server";
import { listAdminSupportRequests, type AdminSupportRequestRow } from "../../../lib/admin/support-requests";
import { SupportRequestActionButton } from "../../../components/admin/support-request-actions";

const HELP_INBOX_MAILTO = "mailto:help@galaxia.app";

/**
 * Read-only-render admin support view. Renders behind admin/layout.tsx's
 * requireAdmin() call — no guard call here, same convention
 * admin/users/page.tsx documents for itself. The read goes through a
 * service-role client built here (listAdminSupportRequests takes an
 * already-constructed client, mirroring listAdminUsers's env-URL/key
 * pattern one level up).
 *
 * Close/reopen are NOT server actions on this page — they're the guarded
 * `/api/admin/support/[id]/{close,reopen}` routes, called from the
 * SupportRequestActionButton client component, so the per-route
 * requireAdminApi() proof (a direct curl to that URL must also be denied)
 * holds independently of this page existing at all.
 *
 * help@ ingestion is NOT built — this only links out to the inbox.
 */
export default async function AdminSupportPage() {
  if (!publicEnv.supabaseUrl || !privateEnv.serviceRole) {
    return (
      <section className="glass-card">
        <h1 className="page-title" style={{ fontSize: "1.6rem" }}>Support</h1>
        <p className="error">{missingEnvMessage("SUPABASE_SERVICE_ROLE_KEY")}</p>
      </section>
    );
  }

  const serviceRoleClient = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, {
    auth: { persistSession: false }
  });

  let requests: AdminSupportRequestRow[] = [];
  let loadError: string | null = null;
  try {
    requests = await listAdminSupportRequests(serviceRoleClient);
  } catch {
    loadError = "Couldn't load support requests. Please try again.";
  }

  const openCount = requests.filter((r) => r.status === "open").length;

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <div>
        <p className="eyebrow">Admin</p>
        <h1 className="page-title" style={{ fontSize: "1.9rem" }}>Support</h1>
        <p className="muted" style={{ marginTop: 6 }}>
          In-app requests only — the help@ inbox is not read into this list.{" "}
          <a href={HELP_INBOX_MAILTO} style={{ color: "var(--gold)" }}>
            Open the help@ inbox ↗
          </a>
        </p>
      </div>

      {loadError ? <p className="error">{loadError}</p> : null}

      {!loadError ? (
        <>
          <div className="glass-card" style={{ overflowX: "auto" }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>From</th>
                  <th>Subject</th>
                  <th>Message</th>
                  <th>Submitted</th>
                  <th>Handled</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="muted">
                      No support requests yet.
                    </td>
                  </tr>
                ) : (
                  requests.map((request) => (
                    <tr key={request.id}>
                      <td>{request.status === "open" ? "Open" : "Closed"}</td>
                      <td>{request.email}</td>
                      <td>{request.subject}</td>
                      <td style={{ whiteSpace: "pre-wrap", maxWidth: 360, minWidth: 220 }}>{request.body}</td>
                      <td>{formatDateTime(request.created_at)}</td>
                      <td>{request.handled_at ? formatDateTime(request.handled_at) : "—"}</td>
                      <td>
                        <SupportRequestActionButton
                          requestId={request.id}
                          transition={request.status === "open" ? "close" : "reopen"}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p className="muted" style={{ fontSize: 13 }}>
            {openCount} open · {requests.length} total
          </p>
        </>
      ) : null}
    </section>
  );
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const date = d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return `${date} ${time}`;
}
