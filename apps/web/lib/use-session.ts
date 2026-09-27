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
export function useSession(): SessionState {
  const [session, setSession] = useState<SessionState>(INITIAL_SESSION);

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
