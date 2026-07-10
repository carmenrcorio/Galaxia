"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { getSiteUrlFromRequestOrigin } from "../lib/env";
import { createSupabaseBrowserClient } from "../lib/supabase/client";

export function SignupForm({ initialEmail = "", nextPath }: { initialEmail?: string; nextPath?: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "confirm">("idle");
  const [error, setError] = useState<string | null>(null);

  // Quick Chart hand-off: /chart's "Save to your galaxy" sends signed-out
  // visitors here with ?next=/welcome?prefill=... so the birth data they
  // already entered survives account creation without retyping.
  const destination = nextPath && nextPath.startsWith("/") ? nextPath : "/welcome";

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("submitting");
    setError(null);
    const siteUrl = getSiteUrlFromRequestOrigin(window.location.origin);
    const redirectUrl = new URL(`${siteUrl}/auth/callback`);
    if (nextPath) redirectUrl.searchParams.set("next", nextPath);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl.toString()
      }
    });
    if (signUpError) {
      setError(signUpError.message.toLowerCase().includes("already") ? "That email is already registered. Log in instead." : signUpError.message);
      setStatus("idle");
      return;
    }
    if (data.session) {
      router.push(destination as never);
      router.refresh();
      return;
    }
    setStatus("confirm");
  };

  return (
    <div className="glass-card" style={{ maxWidth: 460 }}>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <label className="muted" htmlFor="signup-email">
          Email
        </label>
        <input id="signup-email" className="field" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        <label className="muted" htmlFor="signup-password">
          Password
        </label>
        <input id="signup-password" className="field" required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        <button className="pill-link pill-link--gold" type="submit" disabled={status === "submitting"}>
          {status === "submitting" ? "Creating account..." : "Create account"}
        </button>
      </form>
      {status === "confirm" ? <p className="success">Check your email to confirm your account.</p> : null}
      {error ? <p className="error">{error}</p> : null}
      <p className="muted">
        Already have an account? <Link href="/login">Log in</Link>
      </p>
      <p className="muted">
        Want mobile? <Link href="/download">Get the app</Link>
      </p>
    </div>
  );
}
