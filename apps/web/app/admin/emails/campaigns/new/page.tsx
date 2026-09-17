import Link from "next/link";
import { CampaignEditorForm } from "../../../../../components/admin/campaign-editor-form";

/**
 * New campaign draft. Layout requireAdmin() is the page gate.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminNewCampaignPage() {
  return (
    <section style={{ display: "grid", gap: 20 }}>
      <div>
        <p className="eyebrow">
          <Link href="/admin/emails" style={{ color: "var(--gold-soft)" }}>Emails</Link>
          {" / Campaigns"}
        </p>
        <h1 className="page-title" style={{ fontSize: "1.9rem" }}>New campaign</h1>
      </div>
      <div className="glass-card">
        <CampaignEditorForm mode="create" />
      </div>
    </section>
  );
}
