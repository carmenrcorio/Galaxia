"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ButtonState = "idle" | "sending" | "done" | "error";

/**
 * Per-row "Resend email" trigger for /admin/users. POSTs to the guarded
 * `/api/admin/users/[id]/resend-email` route (requireAdminApi at the top of
 * that handler, not here) — this component has no privileged logic of its
 * own, it only reports the route's own decision (which email type it sent,
 * or why it didn't).
 */
export function ResendEmailButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [state, setState] = useState<ButtonState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const onClick = async () => {
    setState("sending");
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/resend-email`, { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as { error?: string; emailType?: "confirmation" | "reset" };
      if (!res.ok) {
        setState("error");
        setMessage(body.error ?? "Couldn't send the email. Please try again.");
        return;
      }
      setState("done");
      setMessage(body.emailType === "reset" ? "Password reset email sent." : "Confirmation email sent.");
      router.refresh();
    } catch {
      setState("error");
      setMessage("Couldn't send the email. Please try again.");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
      <button
        type="button"
        className="pill-link"
        onClick={() => void onClick()}
        disabled={state === "sending"}
        style={{ fontSize: ".76rem", padding: "6px 12px", whiteSpace: "nowrap" }}
      >
        {state === "sending" ? "Sending…" : "Resend email"}
      </button>
      {message ? (
        <span className={state === "error" ? "error" : "success"} style={{ fontSize: ".68rem" }}>
          {message}
        </span>
      ) : null}
    </div>
  );
}
