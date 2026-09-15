import { createClient } from "@supabase/supabase-js";
import { missingEnvMessage, publicEnv } from "../../../lib/env";
import { privateEnv } from "../../../lib/env.server";
import { formatRefreshedAt, readAdminAdoptionMetrics } from "../../../lib/admin/adoption-metrics";
import { AdoptionMetricsDashboard } from "../../../components/admin/adoption-metrics-dashboard";
import { RefreshMetricsButton } from "../../../components/admin/refresh-metrics-button";

/**
 * Founder feature-adoption dashboard. Renders behind admin/layout.tsx's
 * requireAdmin() call (admin_users + isAdmin, the same gate as every other
 * /admin page). No owner-email special case: ENGINEERING.md's admin
 * foundation keyed authorization to a stable auth.users.id, not a mutable
 * email, and this page does not start that pattern.
 *
 * Reads `admin_adoption_metrics` through a service-role client. The view
 * is revoked from anon/authenticated. Counts only: never a person row,
 * note body, or Vela message.
 *
 * No caching: every request re-queries. Refresh re-runs this server
 * component via router.refresh().
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminAnalyticsPage() {
  if (!publicEnv.supabaseUrl || !privateEnv.serviceRole) {
    return (
      <section className="glass-card">
        <h1 className="page-title" style={{ fontSize: "1.6rem" }}>Adoption</h1>
        <p className="error">{missingEnvMessage("SUPABASE_SERVICE_ROLE_KEY")}</p>
      </section>
    );
  }

  const serviceRoleClient = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, {
    auth: { persistSession: false }
  });

  let metrics = null;
  let loadError: string | null = null;
  let refreshedAt: Date | null = null;
  try {
    metrics = await readAdminAdoptionMetrics(serviceRoleClient);
    refreshedAt = new Date();
  } catch {
    loadError = "Couldn't load adoption metrics. Please try again.";
  }

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <div className="admin-analytics-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="page-title" style={{ fontSize: "1.9rem" }}>Adoption</h1>
          {refreshedAt ? (
            <p className="muted" style={{ marginTop: 6 }}>
              Last refreshed {formatRefreshedAt(refreshedAt)}
            </p>
          ) : null}
        </div>
        <RefreshMetricsButton />
      </div>

      {loadError ? <p className="error">{loadError}</p> : null}
      {metrics ? <AdoptionMetricsDashboard metrics={metrics} /> : null}
    </section>
  );
}
