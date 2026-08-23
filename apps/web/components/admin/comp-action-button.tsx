"use client";

import { profileAllowsAccess } from "@galaxia/core";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Per-row comp grant/revoke trigger for /admin/users, cloned from
 * `ResendEmailButton` / `SupportRequestActionButton`'s shape. POSTs to the
 * guarded `/api/admin/users/[id]/comp/{grant,revoke}` route
 * (requireAdminApi + transitionComp at the top of that handler, not
 * here) — this component has no privileged logic of its own.
 *
 * The transition is derived from the row's own `comped` value (an
 * already-comped row only offers "Revoke comp", a non-comped row only
 * offers "Grant comp") — never a static label independent of real state.
 *
 * The confirm copy is computed from the SAME shared `hasAccess`
 * precedence (`profileAllowsAccess` from `@galaxia/core`) that decides
 * real access everywhere else, applied to this row's already-loaded
 * `subscription_status`/`trial_ends_at` with the projected post-write
 * `comped` value — never a hardcoded claim about what will happen
 * (ENGINEERING.md §12, "Galaxia never fabricates"). A revoke on an
 * account with no other access (the real stale-trialing founder/comp
 * shape, see the Phase 0 dump) names that plainly; a revoke on an
 * account that also has genuine active billing or a live trial says so
 * instead of claiming a lockout that would not actually happen.
 */
export function CompActionButton({
  userId,
  email,
  comped,
  subscriptionStatus,
  trialEndsAt
}: {
  userId: string;
  email: string | null;
  comped: boolean;
  subscriptionStatus: string | null;
  trialEndsAt: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const transition: "grant" | "revoke" = comped ? "revoke" : "grant";
  const who = email ?? "this user";

  const onClick = async () => {
    const projectedAccess = profileAllowsAccess({
      subscription_status: subscriptionStatus,
      trial_ends_at: trialEndsAt,
      comped: transition === "grant"
    });
    const confirmMessage =
      transition === "grant"
        ? `Grant comp access to ${who}? This gives permanent access immediately, independent of billing.`
        : projectedAccess
          ? `Revoke comp access for ${who}? They will keep access — their subscription or trial is still live, independent of the comp.`
          : `Revoke comp access for ${who}? This will immediately remove access for ${who} — no active subscription or live trial is covering them.`;
    if (!window.confirm(confirmMessage)) return;

    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/comp/${transition}`, { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? `Couldn't ${transition} comp access. Please try again.`);
        setPending(false);
        return;
      }
      router.refresh();
    } catch {
      setError(`Couldn't ${transition} comp access. Please try again.`);
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
        {pending
          ? transition === "grant"
            ? "Granting…"
            : "Revoking…"
          : transition === "grant"
            ? "Grant comp"
            : "Revoke comp"}
      </button>
      {error ? <span className="error" style={{ fontSize: ".68rem" }}>{error}</span> : null}
    </div>
  );
}
