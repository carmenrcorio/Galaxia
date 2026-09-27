"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { getSiteUrlFromRequestOrigin } from "../lib/env";
import { signupWithNextHref } from "../lib/nav-links";
import { safeNextPath } from "../lib/safe-next-path";
import { createSupabaseBrowserClient } from "../lib/supabase/client";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [status, setStatus] = useState<"idle" | "signing-in" | "reset-sending" | "reset-sent">("idle");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("signing-in");
    setError(null);
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) {
      setError(loginError.message.toLowerCase().includes("invalid login credentials") ? "That email or password doesn't match. Try again." : loginError.message);
      setStatus("idle");
      return;
    }
    router.push(safeNextPath(nextPath) as never);
    router.refresh();
  };

  const forgotPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("reset-sending");
    setError(null);
    const siteUrl = getSiteUrlFromRequestOrigin(window.location.origin);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${siteUrl}/auth/callback?next=/account`
    });
    if (resetError) {
      // FOUNDER-REVIEW: reset request error.
      setError("We couldn't send the reset email. Please try again.");
      setStatus("idle");
      return;
    }
    setStatus("reset-sent");
  };

  return (
    <div className="glass-card" style={{ maxWidth: 460 }}>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <label className="muted" htmlFor="login-email">
          Email
        </label>
        <input id="login-email" className="field" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        <label className="muted" htmlFor="login-password">
          Password
        </label>
        <input id="login-password" className="field" required type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        {/* FOUNDER-REVIEW: "Forgot password?" */}
        <button
          type="button"
          onClick={() => {
            setShowReset(true);
            setResetEmail(email);
            setError(null);
          }}
          style={{ justifySelf: "start", border: 0, padding: 0, background: "transparent", color: "var(--gold)", cursor: "pointer" }}
        >
          Forgot password?
        </button>
        <button className="pill-link pill-link--gold" type="submit" disabled={status === "signing-in"}>
          {status === "signing-in" ? "Signing in..." : "Sign in"}
        </button>
      </form>
      {showReset ? (
        <form onSubmit={forgotPassword} style={{ display: "grid", gap: 10, marginTop: 18 }}>
          {/* FOUNDER-REVIEW: "Email for password reset" */}
          <label className="muted" htmlFor="reset-email">
            Email for password reset
          </label>
          <input
            id="reset-email"
            className="field"
            required
            type="email"
            autoComplete="email"
            value={resetEmail}
            onChange={(event) => setResetEmail(event.target.value)}
          />
          {/* FOUNDER-REVIEW: "Send reset link" / "Sending..." */}
          <button className="pill-link" type="submit" disabled={status === "reset-sending"}>
            {status === "reset-sending" ? "Sending..." : "Send reset link"}
          </button>
        </form>
      ) : null}
      {/* FOUNDER-REVIEW: "Check your email for a reset link." */}
      {status === "reset-sent" ? <p className="success">Check your email for a reset link.</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {/* FOUNDER-REVIEW: "No account? Start 14 days free" */}
      <p className="muted">
        No account?{" "}
        <Link
          href={
            (nextPath && nextPath !== "/start"
              ? signupWithNextHref(safeNextPath(nextPath))
              : "/signup") as never
          }
        >
          Start 14 days free
        </Link>
      </p>
    </div>
  );
}
