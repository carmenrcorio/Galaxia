import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { missingEnvMessage, publicEnv } from "../../../lib/env";
import { privateEnv } from "../../../lib/env.server";
import {
  listCampaignsForAdmin,
  listTemplatesForAdmin,
  openRateLabel,
  type AdminCampaign,
  type EmailTemplateRow
} from "../../../lib/admin/emails";
import { countEmailSends } from "../../../lib/email-tracking";
import { CAMPAIGN_AUDIENCE_LABELS } from "../../../lib/email-kinds";
import { campaignStatusPillInfo, emailEnabledPillInfo } from "../../../lib/admin/status-pill";
import { StatusPill } from "../../../components/admin/status-pill";

/**
 * Admin email catalog: every Galaxia-sent automation plus GoTrue system
 * mail (read-only), with sent/opened counts from email_sends, and a
 * campaigns list. Renders behind admin/layout.tsx's requireAdmin() call.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminEmailsPage() {
  if (!publicEnv.supabaseUrl || !privateEnv.serviceRole) {
    return (
      <section className="glass-card">
        <h1 className="page-title" style={{ fontSize: "1.6rem" }}>Emails</h1>
        <p className="error">{missingEnvMessage("SUPABASE_SERVICE_ROLE_KEY")}</p>
      </section>
    );
  }

  const serviceRoleClient = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, {
    auth: { persistSession: false }
  });

  let templates: EmailTemplateRow[] = [];
  let campaigns: AdminCampaign[] = [];
  let statsByKind = new Map<string, { sent: number; opened: number }>();
  let statsByCampaign = new Map<string, { sent: number; opened: number }>();
  let loadError: string | null = null;
  try {
    templates = await listTemplatesForAdmin(serviceRoleClient);
    campaigns = await listCampaignsForAdmin(serviceRoleClient);
    const counts = await Promise.all([
      ...templates.map(async (row) => {
        const countsForKind = await countEmailSends(serviceRoleClient, row.kind);
        return { key: `kind:${row.kind}`, ...countsForKind };
      }),
      ...campaigns.map(async (row) => {
        const countsForCampaign = await countEmailSends(serviceRoleClient, "campaign", row.id);
        return { key: `campaign:${row.id}`, ...countsForCampaign };
      })
    ]);
    for (const row of counts) {
      if (row.key.startsWith("kind:")) statsByKind.set(row.key.slice(5), { sent: row.sent, opened: row.opened });
      else statsByCampaign.set(row.key.slice(9), { sent: row.sent, opened: row.opened });
    }
  } catch {
    loadError = "Couldn't load emails. Apply the email_templates migration first.";
  }

  const automations = templates.filter((row) => row.category === "automation");
  const system = templates.filter((row) => row.category === "system");

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="page-title" style={{ fontSize: "1.9rem" }}>Emails</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            Opened means the tracking pixel loaded. Some mail apps block it, so this is a floor, not a census.
          </p>
        </div>
        <Link href="/admin/emails/campaigns/new" className="pill-link--gold">
          + New campaign
        </Link>
      </div>

      {loadError ? <p className="error">{loadError}</p> : null}

      {!loadError ? (
        <>
          <div className="glass-card">
            <h2 className="page-title" style={{ fontSize: "1.2rem", margin: "0 0 12px" }}>Automations</h2>
            <table className="admin-table admin-table--fixed admin-table--rows-clickable">
              <colgroup>
                <col style={{ width: "28%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "22%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "12%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Trigger</th>
                  <th>Opened</th>
                  <th aria-hidden="true"></th>
                </tr>
              </thead>
              <tbody>
                {automations.map((row) => {
                  const status = emailEnabledPillInfo(row.enabled);
                  const stats = statsByKind.get(row.kind) ?? { sent: 0, opened: 0 };
                  return (
                    <tr key={row.kind}>
                      <td>{row.name}</td>
                      <td>
                        <StatusPill label={status.label} variant={status.variant} />
                      </td>
                      <td className="muted">{row.triggerLabel}</td>
                      <td>{openRateLabel(stats.sent, stats.opened)}</td>
                      <td>
                        <Link href={`/admin/emails/${row.kind}` as never} className="admin-row-link" aria-label={`Edit ${row.name}`}>
                          Edit <span aria-hidden="true">→</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="glass-card">
            <h2 className="page-title" style={{ fontSize: "1.2rem", margin: "0 0 12px" }}>Sign-in</h2>
            <table className="admin-table admin-table--fixed admin-table--rows-clickable">
              <colgroup>
                <col style={{ width: "28%" }} />
                <col style={{ width: "60%" }} />
                <col style={{ width: "12%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Trigger</th>
                  <th aria-hidden="true"></th>
                </tr>
              </thead>
              <tbody>
                {system.map((row) => (
                  <tr key={row.kind}>
                    <td>{row.name}</td>
                    <td className="muted">{row.triggerLabel}</td>
                    <td>
                      <Link href={`/admin/emails/${row.kind}` as never} className="admin-row-link" aria-label={`View ${row.name}`}>
                        View <span aria-hidden="true">→</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="glass-card">
            <h2 className="page-title" style={{ fontSize: "1.2rem", margin: "0 0 12px" }}>Campaigns</h2>
            <table className="admin-table admin-table--fixed admin-table--rows-clickable">
              <colgroup>
                <col style={{ width: "28%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "24%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "12%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Audience</th>
                  <th>Opened</th>
                  <th aria-hidden="true"></th>
                </tr>
              </thead>
              <tbody>
                {campaigns.length === 0 ? (
                  <tr className="admin-table-row--empty">
                    <td colSpan={5} className="muted">
                      No campaigns yet.
                    </td>
                  </tr>
                ) : (
                  campaigns.map((row) => {
                    const status = campaignStatusPillInfo(row.status);
                    const stats = statsByCampaign.get(row.id) ?? { sent: 0, opened: 0 };
                    return (
                      <tr key={row.id}>
                        <td>{row.name}</td>
                        <td>
                          <StatusPill label={status.label} variant={status.variant} />
                        </td>
                        <td className="muted">{CAMPAIGN_AUDIENCE_LABELS[row.audience]}</td>
                        <td>{openRateLabel(stats.sent, stats.opened)}</td>
                        <td>
                          <Link href={`/admin/emails/campaigns/${row.id}` as never} className="admin-row-link" aria-label={`Open ${row.name}`}>
                            Open <span aria-hidden="true">→</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
}
