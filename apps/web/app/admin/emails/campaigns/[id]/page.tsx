import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { missingEnvMessage, publicEnv } from "../../../../../lib/env";
import { privateEnv } from "../../../../../lib/env.server";
import {
  formatEmailTimestamp,
  getCampaignForAdmin,
  openRateLabel
} from "../../../../../lib/admin/emails";
import { countEmailSends, listRecentEmailSends } from "../../../../../lib/email-tracking";
import { CAMPAIGN_AUDIENCE_LABELS } from "../../../../../lib/email-kinds";
import { campaignStatusPillInfo } from "../../../../../lib/admin/status-pill";
import { StatusPill } from "../../../../../components/admin/status-pill";
import { CampaignEditorForm } from "../../../../../components/admin/campaign-editor-form";

/**
 * Edit/send one campaign and read per-recipient opens. Layout
 * requireAdmin() is the page gate; mutations go through
 * /api/admin/campaigns/[id] (requireAdminApi).
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!publicEnv.supabaseUrl || !privateEnv.serviceRole) {
    return (
      <section className="glass-card">
        <h1 className="page-title" style={{ fontSize: "1.6rem" }}>Campaign</h1>
        <p className="error">{missingEnvMessage("SUPABASE_SERVICE_ROLE_KEY")}</p>
      </section>
    );
  }

  const serviceRoleClient = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, {
    auth: { persistSession: false }
  });
  const campaign = await getCampaignForAdmin(serviceRoleClient, id);
  if (!campaign) notFound();

  const [stats, recent] = await Promise.all([
    countEmailSends(serviceRoleClient, "campaign", id),
    listRecentEmailSends(serviceRoleClient, { campaignId: id, limit: 80 })
  ]);
  const status = campaignStatusPillInfo(campaign.status);

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <div>
        <p className="eyebrow">
          <Link href="/admin/emails" style={{ color: "var(--gold-soft)" }}>Emails</Link>
          {" / "}
          {CAMPAIGN_AUDIENCE_LABELS[campaign.audience]}
        </p>
        <h1 className="page-title" style={{ fontSize: "1.9rem" }}>{campaign.name}</h1>
        <div style={{ marginTop: 10 }}>
          <StatusPill label={status.label} variant={status.variant} />
        </div>
      </div>

      <div className="glass-card">
        <CampaignEditorForm
          mode="edit"
          campaign={{
            id: campaign.id,
            name: campaign.name,
            status: campaign.status,
            audience: campaign.audience,
            copy: campaign.copy
          }}
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
