"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "./supabase/client";

export interface SessionState {
  userId: string | null;
  loading: boolean;
}

const INITIAL_SESSION: SessionState = {
  userId: null,
  loading: true,
};

/**
 * Resolve only the authenticated user's identity.
 *
 * Public pages use this lightweight hook when they need auth-aware chrome but
 * none of the profile, people, or chart data loaded by useViewer().
 */
/**
 * When `initialUserId` is passed (including `null`), the hook skips the
 * anonymous loading frame — used with MarketingNavShell's server session read.
 */
export function useSession(initialUserId?: string | null): SessionState {
  const [session, setSession] = useState<SessionState>(() =>
    initialUserId !== undefined ? { userId: initialUserId, loading: false } : INITIAL_SESSION
  );

  useEffect(() => {
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();

    void supabase.auth.getUser().then(
      ({ data: { user } }) => {
        if (!cancelled) {
          setSession({ userId: user?.id ?? null, loading: false });
        }
      },
      () => {
        if (!cancelled) {
          setSession({ userId: null, loading: false });
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  return session;
}
