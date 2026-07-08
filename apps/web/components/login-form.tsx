"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { getSiteUrlFromRequestOrigin } from "../lib/env";
import { createSupabaseBrowserClient } from "../lib/supabase/client";

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
      setError(loginError.message.toLowerCase().includes("invalid login credentials") ? "That email or password doesn't match. Try again." : loginError.message);
      setStatus("idle");
      return;
    }
    router.push((nextPath || "/app") as never);
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
        <label className="muted" htmlFor="login-email">
          Email
        </label>
        <input id="login-email" className="field" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        <label className="muted" htmlFor="login-password">
          Password
        </label>
        <input id="login-password" className="field" required type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        <button className="pill-link pill-link--gold" type="submit" disabled={status === "submitting"}>
          {status === "submitting" ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <button type="button" className="pill-link" onClick={forgotPassword} style={{ marginTop: 10 }}>
        Forgot password
      </button>
      {status === "reset-sent" ? <p className="success">Reset email sent. Check your inbox.</p> : null}
      {error ? <p className="error">{error}</p> : null}
      <p className="muted">
        Need an account? <Link href="/signup">Sign up</Link>
      </p>
    </div>
  );
}
