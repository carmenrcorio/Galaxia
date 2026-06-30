"use client";

import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "../../lib/supabase/client";

export function LoginClient({ nextPath }: { nextPath: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const sendMagicLink = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("Sending magic link...");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`
      }
    });
    setStatus(error ? error.message : "Check your email for the sign-in link.");
  };

  const signInApple = async () => {
    setStatus("Redirecting to Apple...");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`
      }
    });
    if (error) setStatus(error.message);
  };

  return (
    <>
      <form onSubmit={sendMagicLink} style={{ marginTop: 20, display: "grid", gap: 10, maxWidth: 420 }}>
        <input
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          style={{
            borderRadius: 12,
            border: "1px solid var(--line)",
            background: "var(--ink2)",
            color: "var(--cream)",
            padding: "12px 14px"
          }}
        />
        <button
          type="submit"
          style={{
            borderRadius: 999,
            border: "none",
            background: "var(--gold)",
            color: "var(--ink)",
            padding: "12px 14px",
            fontWeight: 700
          }}
        >
          Send magic link
        </button>
      </form>

      <button
        onClick={signInApple}
        style={{
          marginTop: 12,
          borderRadius: 999,
          border: "1px solid var(--line)",
          background: "transparent",
          color: "var(--cream)",
          padding: "12px 14px",
          fontWeight: 700
        }}
      >
        Continue with Apple
      </button>

      {status ? <p style={{ color: "var(--gold-soft)" }}>{status}</p> : null}
    </>
  );
}
