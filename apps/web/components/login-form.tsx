"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../lib/supabase/client";
import { getSiteUrlFromRequestOrigin } from "../lib/env";

function loginErrorMessage(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) {
    return "That email or password doesn't match. Try again.";
  }
  return "We couldn't sign you in right now. Please try again.";
}

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "reset-sent">("idle");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("submitting");
    setError(null);
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) {
      setError(loginErrorMessage(loginError.message));
      setStatus("idle");
      return;
    }
    router.push((nextPath || "/account") as never);
    router.refresh();
  };

  const forgotPassword = async () => {
    if (!email) {
      setError("Enter your email first, then choose Forgot password.");
      return;
    }
    setError(null);
    const siteUrl = getSiteUrlFromRequestOrigin(window.location.origin);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/callback`
    });
    if (resetError) {
      setError("We couldn't send the reset email. Please try again.");
      return;
    }
    setStatus("reset-sent");
  };

  return (
    <div className="glass-card" style={{ maxWidth: 460 }}>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <label className="label" htmlFor="login-email">
          Email
        </label>
        <input id="login-email" className="field" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        <label className="label" htmlFor="login-password">
          Password
        </label>
        <input id="login-password" className="field" required type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        <button className="pill-link pill-link--gold" type="submit" disabled={status === "submitting"}>
          {status === "submitting" ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <button type="button" className="text-link" onClick={forgotPassword} style={{ marginTop: 10 }}>
        Forgot password
      </button>
      {status === "reset-sent" ? <p className="success">Reset email sent. Check your inbox.</p> : null}
      {error ? <p className="error">{error}</p> : null}
      <p className="muted" style={{ marginTop: 10 }}>
        Need an account? <Link href="/signup">Sign up</Link>
      </p>
      <p className="muted">
        Want the app first? <Link href="/download">Get the app</Link>
      </p>
    </div>
  );
}
