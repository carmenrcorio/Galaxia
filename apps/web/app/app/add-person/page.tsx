"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { AddPersonForm, AskAfterAdd, type AddPersonSavedInfo } from "../../../components/add-person-form";
import { comparePathAfterAddPerson } from "../../../lib/compare-add-person";
import { createSupabaseBrowserClient } from "../../../lib/supabase/client";

/**
 * Standalone add-person entry — not onboarding.
 * Reached from "+ Add person" on /app. Shares AddPersonForm with /welcome
 * step 2, but deliberately omits StepProgress, "Onboarding" eyebrow, and
 * welcome framing. Submit stays on this screen so the ask can happen now,
 * unless Compare sent us here (`next=/app/compare`), in which case we
 * return with the new person selected.
 */
export default function AddPersonPage() {
  return (
    <Suspense fallback={<main className="app-content"><div className="skeleton skeleton-title" /></main>}>
      <AddPersonPageInner />
    </Suspense>
  );
}

function AddPersonPageInner() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState<AddPersonSavedInfo | null>(null);

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

  const cancelHref = comparePathAfterAddPerson({
    next: searchParams.get("next"),
    slot: searchParams.get("slot"),
    personAId: searchParams.get("a"),
    personBId: searchParams.get("b"),
    newPersonId: ""
  })
    ? "/app/compare"
    : "/app";

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
              onSaved={(info) => {
                const dest = comparePathAfterAddPerson({
                  next: searchParams.get("next"),
                  slot: searchParams.get("slot"),
                  personAId: searchParams.get("a"),
                  personBId: searchParams.get("b"),
                  newPersonId: info.personId
                });
                if (dest) {
                  router.push(dest as never);
                  return;
                }
                setLastSaved(info);
              }}
            />
          </section>

          {lastSaved ? (
            <section className="glass-card fade-in fade-in-delay-1">
              <p className="success" style={{ marginBottom: 12 }}>
                {lastSaved.deferred
                  // FOUNDER-REVIEW: success copy. Ask now lives on this screen.
                  ? `${lastSaved.displayName} is in your sky. You can send them a link from this screen, or add a date whenever you're ready.`
                  : `${lastSaved.displayName} is in your constellation.`}
              </p>
              <div style={{ marginBottom: 14 }}>
                <AskAfterAdd userId={userId} info={lastSaved} />
              </div>
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
              <Link href={cancelHref as never} className="pill-link">
                Cancel
              </Link>
            </div>
          )}
        </>
      )}
    </main>
  );
}
