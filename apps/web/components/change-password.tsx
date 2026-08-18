"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MISMATCH_ERROR,
  PASSWORD_RULE_HINT,
  PASSWORD_TOO_SHORT_ERROR
} from "../lib/password-rules";
import { createSupabaseBrowserClient } from "../lib/supabase/client";
import { Spinner } from "./spinner";

/**
 * Change your password while signed in.
 *
 * This is the authenticated flow: it calls `supabase.auth.updateUser` against
 * the live session. It is not the forgot-password email recovery flow on
 * `/login`, which is a separate path and is deliberately untouched here.
 *
 * Two rules it holds to:
 *
 * 1. A live session is required. The session is checked on mount so the control
 *    is never offered to someone who cannot use it, and re-checked immediately
 *    before the write, because a session can expire while this card sits open.
 *
 * 2. Failures are reported honestly. Supabase's own message is shown verbatim
 *    rather than collapsed into a generic "something went wrong", so a password
 *    the server rejects, a reauthentication requirement, or an expired session
 *    each say what actually happened. The only messages authored here are the
 *    two checks made locally before the call (too short, and the two fields
 *    disagreeing), which exist so the user gets an answer without a round trip.
 *
 * The length rule is imported, not restated, so it stays identical to signup.
 */
export function ChangePassword() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [sessionState, setSessionState] = useState<"checking" | "present" | "absent">("checking");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);

  // On a phone this card can sit low enough that the answer renders just below
  // the fold, which reads as the button having done nothing. `nearest` scrolls
  // the minimum needed, so it is a no-op when the message is already visible.
  useEffect(() => {
    if (!saved && !error) return;
    statusRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [saved, error]);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return;
      setSessionState(user ? "present" : "absent");
    });
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSaved(false);

    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      setError(PASSWORD_TOO_SHORT_ERROR);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(PASSWORD_MISMATCH_ERROR);
      return;
    }

    setSubmitting(true);
    // Re-read the session at the moment of the write. A card left open long
    // enough can outlive its session, and the honest answer to that is "sign in
    // again", not a failed write with a vague cause.
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session) {
      setSubmitting(false);
      setSessionState("absent");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setSubmitting(false);
    if (updateError) {
      // Verbatim, never rewritten. The real cause is the useful part.
      setError(updateError.message);
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    setSaved(true);
  };

  if (sessionState === "checking") {
    return (
      <section className="glass-card fade-in">
        <p className="eyebrow" style={{ marginBottom: 10 }}>Password</p>
        <p className="muted" style={{ display: "flex", alignItems: "center", gap: 8, margin: 0, fontSize: 13 }}>
          <Spinner size={12} />
          {/* FOUNDER-REVIEW: authored loading line for the password card. */}
          Checking your session.
        </p>
      </section>
    );
  }

  if (sessionState === "absent") {
    return (
      <section className="glass-card fade-in">
        <p className="eyebrow" style={{ marginBottom: 10 }}>Password</p>
        {/* FOUNDER-REVIEW: authored copy for a signed-out or expired session. */}
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          Your session has ended, so your password cannot be changed from here right now.{" "}
          <a href="/login?next=/account" style={{ color: "var(--gold)" }}>Sign in again</a> and this card comes back.
        </p>
      </section>
    );
  }

  return (
    <section className="glass-card fade-in">
      <p className="eyebrow" style={{ marginBottom: 10 }}>Password</p>
      {/* FOUNDER-REVIEW: authored change-password copy. */}
      <p className="muted" style={{ marginTop: 0, marginBottom: 12, fontSize: 13 }}>
        Set a new password for this account. You stay signed in on this device.
      </p>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 8, maxWidth: 420 }}>
        {/* FOUNDER-REVIEW: authored password field labels and the card eyebrow. */}
        <label className="muted" htmlFor="new-password" style={{ fontSize: 13 }}>
          New password
        </label>
        <input
          id="new-password"
          className="field"
          type="password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
        />
        <label className="muted" htmlFor="confirm-password" style={{ fontSize: 13 }}>
          Confirm new password
        </label>
        <input
          id="confirm-password"
          className="field"
          type="password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
        {/* FOUNDER-REVIEW: authored password hint. */}
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>{PASSWORD_RULE_HINT}</p>
        <div>
          <button
            className="btn-primary"
            type="submit"
            disabled={submitting || !newPassword || !confirmPassword}
            style={{ gap: 8 }}
          >
            {submitting && <Spinner size={12} color="#1a1206" />}
            {/* FOUNDER-REVIEW: authored button labels. */}
            {submitting ? "Changing password..." : "Change password"}
          </button>
        </div>
      </form>
      <div ref={statusRef}>
        {/* FOUNDER-REVIEW: authored success confirmation. */}
        {saved ? (
          <p className="success" style={{ fontSize: 13, marginTop: 10, marginBottom: 0 }}>
            Password changed. Use the new one next time you sign in.
          </p>
        ) : null}
        {error ? (
          <p className="error" style={{ fontSize: 13, marginTop: 10, marginBottom: 0 }}>{error}</p>
        ) : null}
      </div>
    </section>
  );
}
