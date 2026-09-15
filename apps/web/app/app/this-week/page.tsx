"use client";

/**
 * Full This Week feed. The home screen shows a compact preview (max three
 * entries); this page is the unbounded list with read-more and Vela
 * deep-links. Same data as the compact card: stored relational_transits
 * rows, never fabricated.
 */

import { DEFAULT_FETCH_TIMEOUT_MS, withTimeout } from "@galaxia/core";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  RELATIONAL_TRANSIT_FEED_ERROR,
  RELATIONAL_TRANSIT_FEED_LOADING,
  RELATIONAL_TRANSIT_FEED_RETRY,
  RelationalTransitFeed,
} from "../../../components/relational-transit-feed";
import { APP_NAV_BRAND_HREF } from "../../../lib/nav-links";
import { createSupabaseBrowserClient } from "../../../lib/supabase/client";

export default function ThisWeekPage() {
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  const resolveOwner = useCallback(() => {
    const supabase = createSupabaseBrowserClient();
    setAuthReady(false);
    setAuthError(false);
    void withTimeout(supabase.auth.getUser(), DEFAULT_FETCH_TIMEOUT_MS)
      .then(({ data: { user } }) => {
        if (user) setOwnerId(user.id);
        else setAuthError(true);
      })
      .catch(() => {
        setAuthError(true);
      })
      .finally(() => {
        setAuthReady(true);
      });
  }, []);

  useEffect(() => {
    resolveOwner();
  }, [resolveOwner]);

  return (
    <main className="app-content">
      <div className="fade-in">
        <p className="eyebrow">This week</p>
        {/* FOUNDER-REVIEW: full-feed page title. */}
        <h1 className="page-title">Shared transits</h1>
        {/* FOUNDER-REVIEW: full-feed page dek. */}
        <p className="muted">Every slow-moving transit currently pulling on two or more people in your circle at once.</p>
      </div>
      {!authReady ? (
        <section className="glass-card fade-in async-frame" style={{ padding: "14px 16px" }}>
          <p className="eyebrow">This week</p>
          <p className="muted" style={{ fontSize: ".86rem", lineHeight: 1.55, margin: 0 }}>
            {RELATIONAL_TRANSIT_FEED_LOADING}
          </p>
        </section>
      ) : authError || !ownerId ? (
        <section className="glass-card fade-in async-frame" style={{ padding: "14px 16px" }}>
          <p className="eyebrow">This week</p>
          <p className="muted" style={{ fontSize: ".86rem", lineHeight: 1.55, margin: 0 }}>
            {RELATIONAL_TRANSIT_FEED_ERROR}
          </p>
          <p style={{ margin: "8px 0 0" }}>
            <button type="button" className="btn-primary" onClick={resolveOwner}>
              {RELATIONAL_TRANSIT_FEED_RETRY}
            </button>
          </p>
        </section>
      ) : (
        <RelationalTransitFeed ownerId={ownerId} variant="full" />
      )}
      <p>
        {/* FOUNDER-REVIEW: return to constellation home. */}
        <Link href={APP_NAV_BRAND_HREF as never} style={{ color: "var(--gold-soft)", fontSize: ".82rem", textDecoration: "none" }}>
          Back to home
        </Link>
      </p>
    </main>
  );
}
