import type { ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { missingEnvMessage, publicEnv } from "../../../../lib/env";
import { privateEnv } from "../../../../lib/env.server";
import { getAdminUserDetail, type AdminUserDetail } from "../../../../lib/admin/get-user-detail";
import { readAdminAuditHistory, type AdminAuditHistoryEntry } from "../../../../lib/admin/read-audit-history";
import { humanizeAuditAction } from "../../../../lib/admin/audit-log";
import { statusPillInfo, compPillInfo } from "../../../../lib/admin/status-pill";
import { StatusPill } from "../../../../components/admin/status-pill";
import { ResendEmailButton } from "../../../../components/admin/resend-email-button";
import { CompActionButton } from "../../../../components/admin/comp-action-button";

/**
 * Per-user admin account detail. Nests under app/admin/layout.tsx so it
 * inherits that layout's requireAdmin() call — no guard call here, same
 * convention admin/users/page.tsx and admin/support/page.tsx each document
 * for themselves (one call per request, in the layout).
 *
 * HARD BOUNDARY (load-bearing, carries `AdminUserRow`'s exclusion
 * doc-comment intent from list-users.ts): this page is an
 * account-management surface. It reads `auth.users`, `profiles`, and
 * `admin_audit_log` ONLY, via `getAdminUserDetail` and
 * `readAdminAuditHistory` — never `people`, `notes`, `threads`, or any Vela
 * table. There is no "view this user's people" view here or anywhere else
 * in the admin portal, and this page must never grow into one.
 *
 * Actions (resend email, comp grant/revoke) reuse `ResendEmailButton` /
 * `CompActionButton` exactly as-is — they already POST to their own
 * `requireAdminApi()`-guarded routes and call `router.refresh()`, so moving
 * them from the list row to this page needed no change to either
 * component.
 */
export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!publicEnv.supabaseUrl || !privateEnv.serviceRole) {
    return (
      <section className="glass-card">
        <h1 className="page-title" style={{ fontSize: "1.6rem" }}>User</h1>
        <p className="error">{missingEnvMessage("SUPABASE_SERVICE_ROLE_KEY")}</p>
      </section>
    );
  }

  let user: AdminUserDetail | null = null;
  let loadError: string | null = null;
  try {
    user = await getAdminUserDetail(publicEnv.supabaseUrl, privateEnv.serviceRole, id);
  } catch {
    loadError = "Couldn't load this user. Please try again.";
  }

  if (loadError) {
    return (
      <section style={{ display: "grid", gap: 20 }}>
        <BackLink />
        <p className="error">{loadError}</p>
      </section>
    );
  }

  if (!user) {
    return (
      <section style={{ display: "grid", gap: 20 }}>
        <BackLink />
        <div className="glass-card">
          <p className="eyebrow">Admin</p>
          <h1 className="page-title" style={{ fontSize: "1.6rem" }}>User not found</h1>
          {/* FOUNDER-REVIEW: authored — admin user-detail not-found state. */}
          <p className="muted">No user matches this id. They may have been deleted, or the link may be incorrect.</p>
        </div>
      </section>
    );
  }

  let auditHistory: AdminAuditHistoryEntry[] = [];
  let auditError: string | null = null;
  try {
    const serviceRoleClient = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, {
      auth: { persistSession: false }
    });
    auditHistory = await readAdminAuditHistory(serviceRoleClient, id);
  } catch {
    auditError = "Couldn't load admin action history. Please try again.";
  }

  const status = statusPillInfo(user.subscription_status);
  const comp = compPillInfo(user.comped);
  const initials = initialsFor(user.display_name, user.email);

  return (
    <section style={{ display: "grid", gap: 24 }}>
      <BackLink />

      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div
          aria-hidden="true"
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            background: "linear-gradient(165deg, rgba(230,174,108,.22), rgba(230,174,108,.06))",
            border: "1px solid rgba(230,174,108,.28)",
            fontFamily: "var(--serif)",
            fontSize: "1.3rem",
            color: "var(--gold)"
          }}
        >
          {initials}
        </div>
        <div>
          <h1 className="page-title" style={{ fontSize: "1.7rem" }}>{user.email ?? "No email on file"}</h1>
          <p className="muted" style={{ fontSize: ".86rem" }}>
            {user.display_name ?? "No name on file"} · Created {formatDate(user.created_at)}
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14 }}>
        <MetricCard label="Status" value={<StatusPill label={status.label} variant={status.variant} />} />
        <MetricCard label="Comped" value={<StatusPill label={comp.label} variant={comp.variant} />} />
        <MetricCard label="Trial ends" value={formatDate(user.trial_ends_at)} />
        <MetricCard label="Last sign-in" value={formatDateTime(user.last_sign_in_at)} />
      </div>

      <div className="glass-card">
        <h2 className="card-title" style={{ fontSize: "1rem" }}>Account details</h2>
        <table className="admin-table">
          <tbody>
            <DetailRow label="Plan" value={user.plan ?? "—"} />
            <DetailRow label="Tier" value={user.subscription_tier ?? "—"} />
            <DetailRow label="Cancel at period end" value={user.cancel_at_period_end ? "Yes" : "No"} />
            <DetailRow label="Current period end" value={formatDate(user.current_period_end)} />
            <DetailRow label="House system" value={user.house_system ?? "—"} />
            <DetailRow label="Timezone" value={user.timezone ?? "—"} />
            <DetailRow label="Nudge emails" value={user.daily_nudge_emails_enabled ? "On" : "Off"} />
            <DetailRow
              label="Email confirmed"
              value={user.email_confirmed_at ? formatDate(user.email_confirmed_at) : "No"}
            />
            <DetailRow label="Stripe customer" value={user.stripe_customer_id ?? "—"} />
          </tbody>
        </table>
      </div>

      <div className="glass-card" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        <ResendEmailButton userId={user.id} />
        <CompActionButton
          userId={user.id}
          email={user.email}
          comped={user.comped}
          subscriptionStatus={user.subscription_status}
          trialEndsAt={user.trial_ends_at}
        />
      </div>

      <div>
        <h2 className="card-title" style={{ fontSize: "1.1rem" }}>Admin actions</h2>
        {auditError ? (
          <p className="error">{auditError}</p>
        ) : auditHistory.length === 0 ? (
          // FOUNDER-REVIEW: authored — empty admin-audit-history state.
          <p className="muted">No admin actions recorded for this user.</p>
        ) : (
          <div className="glass-card">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>By</th>
                  <th>Before</th>
                  <th>After</th>
                  <th>When</th>
                  <th>Metadata</th>
                </tr>
              </thead>
              <tbody>
                {auditHistory.map((entry) => (
                  <tr key={entry.id}>
                    <td>{humanizeAuditAction(entry.action)}</td>
                    <td>{entry.actorEmail ?? entry.actorId}</td>
                    <td>{renderAuditFieldValue(entry.before)}</td>
                    <td>{renderAuditFieldValue(entry.after)}</td>
                    <td>{formatDateTime(entry.createdAt)}</td>
                    <td>{renderAuditMetadata(entry.metadata)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function BackLink() {
  return (
    <Link href="/admin/users" className="pill-link" style={{ width: "fit-content" }}>
      ← Back to users
    </Link>
  );
}

function MetricCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="glass-card" style={{ padding: 16, display: "grid", gap: 6 }}>
      <span className="muted" style={{ fontSize: ".68rem", fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase" }}>
        {label}
      </span>
      <span style={{ fontSize: "1rem", color: "var(--cream)" }}>{value}</span>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <th scope="row" style={{ width: "40%" }}>
        {label}
      </th>
      <td>{value}</td>
    </tr>
  );
}

/**
 * NEVER-FABRICATE (ENGINEERING.md §12): `admin_audit_log.before`/`after`
 * are null on every existing row today — no writer populates them (see
 * `read-audit-history.ts`'s own doc comment). This renders that absence
 * plainly as "Unknown" rather than inferring "no change" or synthesizing a
 * value that was never recorded.
 */
function renderAuditFieldValue(value: unknown): string {
  if (value === null || value === undefined) {
    // FOUNDER-REVIEW: authored — absent before/after value in audit history.
    return "Unknown";
  }
  return typeof value === "string" ? value : JSON.stringify(value);
}

function renderAuditMetadata(metadata: Record<string, unknown> | null): string {
  if (!metadata || Object.keys(metadata).length === 0) return "—";
  return Object.entries(metadata)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(", ");
}

function initialsFor(displayName: string | null, email: string | null): string {
  const source = (displayName ?? "").trim() || (email ?? "").trim();
  if (!source) return "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const date = d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return `${date} ${time}`;
}
