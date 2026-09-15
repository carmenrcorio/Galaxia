import {
  ADOPTION_SECTIONS,
  formatAvg,
  formatCount,
  formatWeekDelta,
  type AdminAdoptionMetrics,
  type AdoptionMetricRow
} from "../../lib/admin/adoption-metrics";

function displayValue(metrics: AdminAdoptionMetrics, row: AdoptionMetricRow): string {
  const value = metrics[row.valueKey];
  return row.format === "avg" ? formatAvg(value) : formatCount(value);
}

/**
 * Read-only number table for /admin/analytics. No charts, no per-user
 * rows. Renders inside a server component; the Refresh button is a
 * separate client island.
 */
export function AdoptionMetricsDashboard({ metrics }: { metrics: AdminAdoptionMetrics }) {
  return (
    <div className="admin-analytics-sections">
      {ADOPTION_SECTIONS.map((section) => (
        <section key={section.title} className="glass-card" style={{ overflowX: "auto" }}>
          <h2 className="admin-analytics-section-title">{section.title}</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Count</th>
                <th>This week</th>
              </tr>
            </thead>
            <tbody>
              {section.rows.map((row) => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td>
                    <span className={row.weekOnly ? "admin-metric-week" : "admin-metric-value"}>
                      {displayValue(metrics, row)}
                    </span>
                  </td>
                  <td>
                    {row.weekKey ? (
                      <span className="admin-metric-week">{formatWeekDelta(metrics[row.weekKey])}</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
