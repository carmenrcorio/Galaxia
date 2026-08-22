import type { ReactNode } from "react";
import Link from "next/link";
import { requireAdmin } from "../../lib/require-admin";

/**
 * Admin shell layout — every page nested under /admin/** inherits this
 * guard for free by being rendered through here. requireAdmin() redirects
 * (fails closed) any caller who isn't a signed-in admin before any child
 * page renders — called exactly once per request, here, not re-derived in
 * each page.
 *
 * This protects PAGE RENDERING only. It does not protect /api/admin/**
 * route handlers hit directly (curl, fetch, or anything else that skips
 * this layout entirely) — every one of those calls requireAdminApi()
 * itself. Both layers are required; neither is a substitute for the other
 * (see require-admin.ts for why).
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin("/app");

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <nav className="admin-nav">
        <div className="container admin-nav-inner">
          <Link href="/admin/users" className="admin-nav-brand">
            Galax<span style={{ fontStyle: "italic", fontWeight: 500 }}>ia</span> Admin
          </Link>
          <div className="admin-nav-links">
            <Link href="/admin/users" className="pill-link">
              Users
            </Link>
            <Link href="/admin/support" className="pill-link">
              Support
            </Link>
          </div>
        </div>
      </nav>
      <main className="app-content">{children}</main>
    </div>
  );
}
