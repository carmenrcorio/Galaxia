"use client";

import { joinFullName } from "@galaxia/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { syncSignupNameToProfile } from "../lib/account-name";
import { getSiteUrlFromRequestOrigin } from "../lib/env";
import { PASSWORD_MIN_LENGTH, PASSWORD_RULE_HINT } from "../lib/password-rules";
import { createSupabaseBrowserClient } from "../lib/supabase/client";

export function SignupForm({ initialEmail = "", nextPath }: { initialEmail?: string; nextPath?: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
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
    // The name rides in auth metadata because signUp can return without a
    // session (email confirmation), and `profiles` is not writable until there
    // is one. syncSignupNameToProfile copies it into profiles.display_name,
    // which is the only field anything reads for display.
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl.toString(),
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: joinFullName(firstName, lastName)
        }
      }
    });
    if (signUpError) {
      setError(signUpError.message.toLowerCase().includes("already") ? "That email is already registered. Log in instead." : signUpError.message);
      setStatus("idle");
      return;
    }
    if (data.session) {
      await syncSignupNameToProfile(supabase, data.user);
      router.push(destination as never);
      router.refresh();
      return;
    }
    setStatus("confirm");
  };

  return (
    <div className="glass-card" style={{ maxWidth: 460 }}>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        {/* FOUNDER-REVIEW: authored signup name labels and hint. */}
        <label className="muted" htmlFor="signup-first-name">
          First name
        </label>
        <input
          id="signup-first-name"
          className="field"
          required
          autoComplete="given-name"
          maxLength={80}
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
        />
        <label className="muted" htmlFor="signup-last-name">
          Last name
        </label>
        <input
          id="signup-last-name"
          className="field"
          autoComplete="family-name"
          maxLength={80}
          value={lastName}
          onChange={(event) => setLastName(event.target.value)}
        />
        <p className="muted" style={{ fontSize: ".78rem", margin: 0 }}>
          This is what Galaxia calls you. Your email stays your login and is never shown as your name.
        </p>
        <label className="muted" htmlFor="signup-email">
          Email
        </label>
        <input id="signup-email" className="field" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        <label className="muted" htmlFor="signup-password">
          Password
        </label>
        <input id="signup-password" className="field" required minLength={PASSWORD_MIN_LENGTH} autoComplete="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        {/* FOUNDER-REVIEW: authored password hint. */}
        <p className="muted" style={{ fontSize: ".78rem", margin: 0 }}>{PASSWORD_RULE_HINT}</p>
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
