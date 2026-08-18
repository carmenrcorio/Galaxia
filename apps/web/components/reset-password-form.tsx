"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "../lib/supabase/client";

export function ResetPasswordForm() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Use at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setStatus("submitting");
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setStatus("idle");
      setError("This reset link is invalid or expired. Request a new one from login.");
      return;
    }

    setStatus("success");
    setTimeout(() => {
      router.push("/login");
      router.refresh();
    }, 1200);
  };

  return (
    <div className="glass-card" style={{ maxWidth: 460 }}>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <label className="muted" htmlFor="new-password">
          New password
        </label>
        <input
          id="new-password"
          className="field"
          type="password"
          minLength={6}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <label className="muted" htmlFor="confirm-new-password">
          Confirm new password
        </label>
        <input
          id="confirm-new-password"
          className="field"
          type="password"
          minLength={6}
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
        <button className="pill-link pill-link--gold" type="submit" disabled={status === "submitting"}>
          {status === "submitting" ? "Saving..." : "Save new password"}
        </button>
      </form>

      {status === "success" ? (
        <p className="success">Password updated. Redirecting to login...</p>
      ) : null}
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
