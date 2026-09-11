import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { missingEnvMessage, publicEnv } from "../../../lib/env";
import { privateEnv } from "../../../lib/env.server";
import { listPostsForAdmin, type AdminPostListRow } from "../../../lib/admin/posts";
import { postStatusPillInfo } from "../../../lib/admin/status-pill";
import { StatusPill } from "../../../components/admin/status-pill";

/**
 * Admin post list — mirrors `/admin/users`'s shape (missingEnv guard,
 * service-role read via a `lib/admin/*` module, `glass-card` table,
 * `pill-link` actions) rather than inventing a separate admin design
 * language. Renders behind `app/admin/layout.tsx`'s `requireAdmin()` call —
 * no guard call here, same one-call-per-request convention every other
 * page under `/admin/**` documents for itself.
 */
export default async function AdminPostsPage() {
  if (!publicEnv.supabaseUrl || !privateEnv.serviceRole) {
    return (
      <section className="glass-card">
        <h1 className="page-title" style={{ fontSize: "1.6rem" }}>Posts</h1>
        <p className="error">{missingEnvMessage("SUPABASE_SERVICE_ROLE_KEY")}</p>
      </section>
    );
  }

  const serviceRoleClient = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, {
    auth: { persistSession: false }
  });

  let posts: AdminPostListRow[] = [];
  let loadError: string | null = null;
  try {
    posts = await listPostsForAdmin(serviceRoleClient);
  } catch {
    loadError = "Couldn't load posts. Please try again.";
  }

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="page-title" style={{ fontSize: "1.9rem" }}>Posts</h1>
        </div>
        <Link href="/admin/posts/new" className="pill-link--gold">
          + New post
        </Link>
      </div>

      {loadError ? <p className="error">{loadError}</p> : null}

      {!loadError ? (
        <div className="glass-card">
          <table className="admin-table admin-table--fixed admin-table--rows-clickable">
            <colgroup>
              <col style={{ width: "52%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "12%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Published</th>
                <th aria-hidden="true"></th>
              </tr>
            </thead>
            <tbody>
              {posts.length === 0 ? (
                <tr className="admin-table-row--empty">
                  <td colSpan={4} className="muted">
                    No posts yet.
                  </td>
                </tr>
              ) : (
                posts.map((post) => {
                  const status = postStatusPillInfo(post.status);
                  return (
                    <tr key={post.id}>
                      <td>{post.title}</td>
                      <td>
                        <StatusPill label={status.label} variant={status.variant} />
                      </td>
                      <td>{formatDate(post.published_at)}</td>
                      <td>
                        <Link href={`/admin/posts/${post.id}`} className="admin-row-link" aria-label={`Edit ${post.title}`}>
                          Edit <span aria-hidden="true">→</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function formatDate(iso: string | null): string {
  // FOUNDER-REVIEW: rewritten (no U+2014).
  if (!iso) return "none";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "none";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
