import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { missingEnvMessage, publicEnv } from "../../../../lib/env";
import { privateEnv } from "../../../../lib/env.server";
import {
  formatEmailTimestamp,
  getTemplateForAdmin,
  openRateLabel
} from "../../../../lib/admin/emails";
import { countEmailSends, listRecentEmailSends } from "../../../../lib/email-tracking";
import { isEmailKind } from "../../../../lib/email-kinds";
import { emailEnabledPillInfo } from "../../../../lib/admin/status-pill";
import { StatusPill } from "../../../../components/admin/status-pill";
import { EmailEditorForm } from "../../../../components/admin/email-editor-form";

/**
 * Editor for one email kind. Layout requireAdmin() is the page gate.
 * Mutations go through /api/admin/emails/[kind] (requireAdminApi).
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminEmailKindPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind: rawKind } = await params;
  const kind = decodeURIComponent(rawKind);
  if (kind === "campaigns") notFound();
  if (!isEmailKind(kind)) notFound();

  if (!publicEnv.supabaseUrl || !privateEnv.serviceRole) {
    return (
      <section className="glass-card">
        <h1 className="page-title" style={{ fontSize: "1.6rem" }}>Email</h1>
        <p className="error">{missingEnvMessage("SUPABASE_SERVICE_ROLE_KEY")}</p>
      </section>
    );
  }

  const serviceRoleClient = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, {
    auth: { persistSession: false }
  });
  const template = await getTemplateForAdmin(serviceRoleClient, kind);
  if (!template) {
    return (
      <section className="glass-card">
        <h1 className="page-title" style={{ fontSize: "1.6rem" }}>Email</h1>
        <p className="error">Couldn&apos;t load this email. Apply the email_templates migration first.</p>
      </section>
    );
  }

  const [stats, recent] = await Promise.all([
    countEmailSends(serviceRoleClient, kind),
    listRecentEmailSends(serviceRoleClient, { kind, limit: 40 })
  ]);
  const status = emailEnabledPillInfo(template.enabled);

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <div>
        <p className="eyebrow">
          <Link href="/admin/emails" style={{ color: "var(--gold-soft)" }}>Emails</Link>
          {" / "}
          {template.category === "automation" ? "Automation" : "Sign-in"}
        </p>
        <h1 className="page-title" style={{ fontSize: "1.9rem" }}>{template.name}</h1>
        <p className="muted" style={{ marginTop: 6 }}>{template.description}</p>
        <p className="muted" style={{ marginTop: 4 }}>{template.triggerLabel}</p>
        <div style={{ marginTop: 10 }}>
          <StatusPill label={status.label} variant={status.variant} />
        </div>
      </div>

      <div className="glass-card">
        <EmailEditorForm
          kind={template.kind}
          category={template.category}
          editableFields={template.editableFields}
          enabled={template.enabled}
          copy={template.copy}
          canTest={template.category === "automation"}
        />
      </div>

      <div className="glass-card">
        <h2 className="page-title" style={{ fontSize: "1.2rem", margin: "0 0 8px" }}>Opens</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          {openRateLabel(stats.sent, stats.opened)}. Opened means the tracking pixel loaded. Some mail apps block it, so this is a floor, not a census.
        </p>
        <table className="admin-table">
          <thead>
            <tr>
              <th>To</th>
              <th>Subject</th>
              <th>Sent</th>
              <th>Opened</th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 ? (
              <tr className="admin-table-row--empty">
                <td colSpan={4} className="muted">No sends yet.</td>
              </tr>
            ) : (
              recent.map((row) => (
                <tr key={row.id}>
                  <td className="admin-table-email-cell">{row.recipient_email}{row.is_test ? " (test)" : ""}</td>
                  <td>{row.subject}</td>
                  <td>{formatEmailTimestamp(row.sent_at)}</td>
                  <td>{row.opened_at ? `${formatEmailTimestamp(row.opened_at)}${row.open_count > 1 ? ` ×${row.open_count}` : ""}` : "no"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
