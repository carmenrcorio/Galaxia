"use client";

/**
 * Change your password and your email from Settings, while signed in.
 *
 * Both controls call `supabase.auth.updateUser` against the live session.
 * Neither is the forgot-password recovery flow on `/login`, which is a
 * separate path and is untouched by this card.
 *
 * Three rules it holds to:
 *
 * 1. The session is re-read immediately before each write. A Settings page left
 *    open can outlive its session, and the honest answer to that is "sign in
 *    again", not a failed write with a vague cause.
 * 2. Failures are reported verbatim. The auth service's own message is shown
 *    rather than collapsed into something generic, so a leaked password it
 *    refuses, an address it will not deliver to, or an expired session each say
 *    what actually happened. The only authored errors are the local checks made
 *    before the call, which exist so a typo gets an answer without a round trip.
 * 3. The rule and the copy live in `@galaxia/core`, not here, so the mobile
 *    Settings screen shows the same thing by construction.
 *
 * The existing `ChangePassword` card on `/account` is the same flow on another
 * surface. It stays: the pointer this replaces on Settings was a link to it.
 */

import {
  EMAIL_CHANGE_COPY,
  PASSWORD_CHANGE_COPY,
  PASSWORD_RULE_HINT,
  checkEmailChange,
  checkPasswordChange,
  emailChangeSentMessage
} from "@galaxia/core";
import { useId, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "../lib/supabase/client";
import { Spinner } from "./spinner";

type Feedback = { tone: "success" | "error"; message: string } | null;

function DisclosureButton({
  label,
  open,
  panelId,
  onToggle
}: {
  label: string;
  open: boolean;
  panelId: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={panelId}
      onClick={onToggle}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        width: "100%",
        textAlign: "left",
        cursor: "pointer",
        borderRadius: 12,
        padding: "10px 14px",
        background: open ? "rgba(230,174,108,.09)" : "rgba(255,255,255,.02)",
        border: open ? "1px solid rgba(230,174,108,.45)" : "1px solid rgba(183,154,216,.14)"
      }}
    >
      <span style={{ color: open ? "var(--gold)" : "var(--cream)", fontWeight: 600, fontSize: ".9rem" }}>
        {label}
      </span>
      <span aria-hidden="true" style={{ color: "var(--mist2)", fontSize: ".8rem" }}>
        {open ? "\u2212" : "+"}
      </span>
    </button>
  );
}

function FeedbackLine({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  return (
    <p
      className={feedback.tone === "success" ? "success" : "error"}
      role="status"
      style={{ fontSize: ".78rem", marginTop: 8, marginBottom: 0 }}
    >
      {feedback.message}
    </p>
  );
}

export function SettingsAccountCredentials({ accountEmail }: { accountEmail?: string | null }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const passwordPanelId = useId();
  const emailPanelId = useId();

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<Feedback>(null);

  const [emailOpen, setEmailOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState<Feedback>(null);

  const submitPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordFeedback(null);

    const check = checkPasswordChange(newPassword, confirmPassword);
    if (!check.ok) {
      setPasswordFeedback({ tone: "error", message: check.error });
      return;
    }

    setSavingPassword(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setSavingPassword(false);
      setPasswordFeedback({ tone: "error", message: PASSWORD_CHANGE_COPY.sessionExpired });
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      setPasswordFeedback({ tone: "error", message: error.message });
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    setPasswordFeedback({ tone: "success", message: PASSWORD_CHANGE_COPY.success });
  };

  const submitEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    setEmailFeedback(null);

    const check = checkEmailChange(newEmail, accountEmail);
    if (!check.ok) {
      setEmailFeedback({ tone: "error", message: check.error });
      return;
    }

    setSavingEmail(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setSavingEmail(false);
      setEmailFeedback({ tone: "error", message: EMAIL_CHANGE_COPY.sessionExpired });
      return;
    }

    const { error } = await supabase.auth.updateUser({ email: check.email });
    setSavingEmail(false);
    if (error) {
      setEmailFeedback({ tone: "error", message: error.message });
      return;
    }
    setNewEmail("");
    setEmailFeedback({
      tone: "success",
      message: emailChangeSentMessage(check.email, accountEmail)
    });
  };

  return (
    <section className="glass-card">
      <h2 className="card-title">Account</h2>
      <p className="muted" style={{ marginBottom: 12 }}>
        {accountEmail
          ? `You sign in with ${accountEmail}. Change that address or your password here.`
          : "Change the address you sign in with, or your password, here."}
      </p>

      <div style={{ display: "grid", gap: 8 }}>
        <div>
          <DisclosureButton
            label={PASSWORD_CHANGE_COPY.sectionLabel}
            open={passwordOpen}
            panelId={passwordPanelId}
            onToggle={() => setPasswordOpen((prev) => !prev)}
          />
          {passwordOpen ? (
            <div id={passwordPanelId} style={{ padding: "12px 2px 4px" }}>
              <p className="muted" style={{ fontSize: ".78rem", marginTop: 0, marginBottom: 10 }}>
                {PASSWORD_CHANGE_COPY.lead}
              </p>
              <form onSubmit={submitPassword} style={{ display: "grid", gap: 8, maxWidth: 420 }}>
                <label className="muted" htmlFor="settings-new-password" style={{ fontSize: ".78rem" }}>
                  {PASSWORD_CHANGE_COPY.newLabel}
                </label>
                {/* No `required` / `minLength` here on purpose. Native
                    constraint validation would intercept the submit and show
                    the browser's own tooltip instead of the authored message,
                    which would also mean web and mobile said different things
                    about the same typo. The shared check owns the answer; the
                    rule is still stated under the fields. */}
                <input
                  id="settings-new-password"
                  className="field field--rect"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  disabled={savingPassword}
                />
                <label className="muted" htmlFor="settings-confirm-password" style={{ fontSize: ".78rem" }}>
                  {PASSWORD_CHANGE_COPY.confirmLabel}
                </label>
                <input
                  id="settings-confirm-password"
                  className="field field--rect"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  disabled={savingPassword}
                />
                <p className="muted" style={{ fontSize: ".74rem", margin: 0 }}>{PASSWORD_RULE_HINT}</p>
                <button
                  type="submit"
                  className="pill-link"
                  style={{ width: "fit-content", cursor: "pointer", gap: 8 }}
                  disabled={savingPassword || !newPassword || !confirmPassword}
                >
                  {savingPassword && <Spinner size={11} />}
                  {savingPassword ? PASSWORD_CHANGE_COPY.submitting : PASSWORD_CHANGE_COPY.submit}
                </button>
              </form>
              <FeedbackLine feedback={passwordFeedback} />
            </div>
          ) : null}
        </div>

        <div>
          <DisclosureButton
            label={EMAIL_CHANGE_COPY.sectionLabel}
            open={emailOpen}
            panelId={emailPanelId}
            onToggle={() => setEmailOpen((prev) => !prev)}
          />
          {emailOpen ? (
            <div id={emailPanelId} style={{ padding: "12px 2px 4px" }}>
              <p className="muted" style={{ fontSize: ".78rem", marginTop: 0, marginBottom: 10 }}>
                {EMAIL_CHANGE_COPY.lead}
              </p>
              <form onSubmit={submitEmail} style={{ display: "grid", gap: 8, maxWidth: 420 }}>
                <label className="muted" htmlFor="settings-new-email" style={{ fontSize: ".78rem" }}>
                  {EMAIL_CHANGE_COPY.newLabel}
                </label>
                {/* `text` with an email keyboard, not `type="email"`, for the
                    same reason the password fields carry no `minLength`: the
                    shared check is what answers a malformed address, on both
                    platforms, in the interface voice. */}
                <input
                  id="settings-new-email"
                  className="field field--rect"
                  type="text"
                  inputMode="email"
                  autoComplete="email"
                  value={newEmail}
                  onChange={(event) => setNewEmail(event.target.value)}
                  disabled={savingEmail}
                />
                <button
                  type="submit"
                  className="pill-link"
                  style={{ width: "fit-content", cursor: "pointer", gap: 8 }}
                  disabled={savingEmail || !newEmail.trim()}
                >
                  {savingEmail && <Spinner size={11} />}
                  {savingEmail ? EMAIL_CHANGE_COPY.submitting : EMAIL_CHANGE_COPY.submit}
                </button>
              </form>
              <FeedbackLine feedback={emailFeedback} />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
