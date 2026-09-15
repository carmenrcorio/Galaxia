"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

/**
 * Re-runs the /admin/analytics server component (force-dynamic, no cache)
 * without a full navigation. The page itself stays a server component.
 */
export function RefreshMetricsButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="pill-link"
      disabled={pending}
      onClick={() => {
        startTransition(() => {
          router.refresh();
        });
      }}
    >
      {pending ? "Refreshing…" : "Refresh"}
    </button>
  );
}
