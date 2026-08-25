"use client";

import { profileAllowsAccess } from "@galaxia/core";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

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
 *
 * `pending` (the rendered disabled/"…ing" state) is the OR of two
 * genuinely-in-flight phases, never a flag that can outlive the work it
 * represents (this is the Phase 0 fix — previously `pending` was only
 * ever cleared on the error path, so a SUCCESSFUL grant/revoke left the
 * button stuck disabled forever, relabeled for the opposite action once
 * `comped` flipped, because `router.refresh()` re-renders this component
 * in place rather than remounting it):
 *   1. `isSubmitting` — the POST itself, guaranteed to clear via
 *      try/finally on every path (resolved, rejected, or non-ok), so the
 *      fetch phase can never leave `pending` stuck true.
 *   2. `isRefreshing` — `router.refresh()`'s own completion, tracked by
 *      wrapping it in `startTransition` (the documented idiomatic
 *      App Router pattern for a `router.refresh()` loading state) so the
 *      button stays disabled until the row's new `comped` prop has
 *      actually landed, rather than flashing an enabled button still
 *      labeled for the action that just completed.
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, startRefresh] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const pending = isSubmitting || isRefreshing;
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

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/comp/${transition}`, { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? `Couldn't ${transition} comp access. Please try again.`);
        return;
      }
      // Stay disabled until the refresh actually delivers the row's new
      // `comped` — startTransition is what makes `isRefreshing` track
      // router.refresh()'s completion rather than just the dispatch call.
      startRefresh(() => {
        router.refresh();
      });
    } catch {
      setError(`Couldn't ${transition} comp access. Please try again.`);
    } finally {
      // Always clears, on every path (ok, not-ok, or thrown) — the fetch
      // phase can never leave `pending` stuck true. `isRefreshing` (set
      // above, success-only) independently covers the refresh phase.
      setIsSubmitting(false);
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
