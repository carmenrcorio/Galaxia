"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Per-row Close/Reopen trigger for /admin/support. POSTs to the guarded
 * `/api/admin/support/[id]/{close,reopen}` route (requireAdminApi at the
 * top of that handler, not here). No privileged logic lives in this
 * component — it only reports the route's own decision.
 */
export function SupportRequestActionButton({
  requestId,
  transition
}: {
  requestId: string;
  transition: "close" | "reopen";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = transition === "close" ? "Close" : "Reopen";

  const onClick = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/support/${requestId}/${transition}`, { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? `Couldn't ${label.toLowerCase()} this request. Please try again.`);
        setPending(false);
        return;
      }
      router.refresh();
    } catch {
      setError(`Couldn't ${label.toLowerCase()} this request. Please try again.`);
      setPending(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
      <button
        type="button"
        className="pill-link"
        onClick={() => void onClick()}
        disabled={pending}
        style={{ fontSize: ".76rem", padding: "6px 12px", whiteSpace: "nowrap" }}
      >
        {pending ? `${label}ing…` : label}
      </button>
      {error ? <span className="error" style={{ fontSize: ".68rem" }}>{error}</span> : null}
    </div>
  );
}
