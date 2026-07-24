"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AddPersonForm } from "../../../components/add-person-form";
import { createSupabaseBrowserClient } from "../../../lib/supabase/client";

/**
 * Standalone add-person entry — not onboarding.
 * Reached from "+ Add person" on /app. Shares AddPersonForm with /welcome
 * step 2, but deliberately omits StepProgress, "Onboarding" eyebrow, and
 * welcome framing.
 */
export default function AddPersonPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState<{
    displayName: string;
    personId: string;
    deferred: boolean;
  } | null>(null);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
      setLoading(false);
    };
    void load();
  }, [supabase]);

  return (
    <main className="app-content">
      <div className="fade-in">
        <p className="eyebrow">Constellation</p>
        <h1 className="page-title">Add a person</h1>
        <p className="muted" style={{ marginBottom: 4 }}>
          Name, how you know them, and whatever birth details you have.
        </p>
      </div>

      {loading ? (
        <div className="glass-card">
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-text" style={{ width: "90%" }} />
          <div className="skeleton skeleton-text" style={{ width: "75%" }} />
        </div>
      ) : !userId ? (
        <section className="glass-card fade-in">
          <p className="muted">Please sign in to add someone to your constellation.</p>
          <Link href="/login" className="btn-primary" style={{ marginTop: 14 }}>
            Sign in
          </Link>
        </section>
      ) : (
        <>
          <section className="glass-card fade-in">
            <AddPersonForm
              userId={userId}
              showStatus={false}
              onSaved={(info) => setLastSaved(info)}
            />
          </section>

          {lastSaved ? (
            <section className="glass-card fade-in fade-in-delay-1">
              <p className="success" style={{ marginBottom: 12 }}>
                {lastSaved.deferred
                  ? `${lastSaved.displayName} is in your sky — you can add birth details whenever you're ready.`
                  : `${lastSaved.displayName} is in your constellation.`}
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link className="btn-primary" href="/app">
                  Back to constellation
                </Link>
                <Link className="pill-link" href={`/app/person/${lastSaved.personId}`}>
                  View profile
                </Link>
                <button type="button" className="pill-link" onClick={() => setLastSaved(null)}>
                  Add another
                </button>
              </div>
            </section>
          ) : (
            <div className="fade-in" style={{ marginTop: 4 }}>
              <Link href="/app" className="pill-link">
                Cancel
              </Link>
            </div>
          )}
        </>
      )}
    </main>
  );
}
