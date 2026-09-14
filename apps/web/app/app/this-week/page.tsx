"use client";

/**
 * Full This Week feed. The home screen shows a compact preview (max three
 * entries); this page is the unbounded list with read-more and Vela
 * deep-links. Same data as the compact card: stored relational_transits
 * rows, never fabricated.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { RelationalTransitFeed } from "../../../components/relational-transit-feed";
import { APP_NAV_BRAND_HREF } from "../../../lib/nav-links";
import { createSupabaseBrowserClient } from "../../../lib/supabase/client";

export default function ThisWeekPage() {
  const [ownerId, setOwnerId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setOwnerId(user.id);
    });
  }, []);

  return (
    <main className="app-content">
      <div className="fade-in">
        <p className="eyebrow">This week</p>
        {/* FOUNDER-REVIEW: full-feed page title. */}
        <h1 className="page-title">Shared transits</h1>
        {/* FOUNDER-REVIEW: full-feed page dek. */}
        <p className="muted">Every slow-moving transit currently pulling on two or more people in your circle at once.</p>
      </div>
      {ownerId ? <RelationalTransitFeed ownerId={ownerId} variant="full" /> : null}
      <p>
        {/* FOUNDER-REVIEW: return to constellation home. */}
        <Link href={APP_NAV_BRAND_HREF as never} style={{ color: "var(--gold-soft)", fontSize: ".82rem", textDecoration: "none" }}>
          Back to home
        </Link>
      </p>
    </main>
  );
}
