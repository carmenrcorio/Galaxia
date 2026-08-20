"use client";

import { useEffect } from "react";
import { backfillProfileTimezoneIfMissing } from "../lib/timezone";
import { createSupabaseBrowserClient } from "../lib/supabase/client";

/**
 * Effect-only, no UI — mirrors `TrialBanner`'s mount -> getUser -> own-row
 * pattern (see trial-banner.tsx). Backfills `profiles.timezone` for
 * accounts that don't have one yet: pre-existing accounts (the primary
 * case this exists for) and any new account whose signup-session piggyback
 * (see `signup-form.tsx`) didn't run because email confirmation deferred
 * the first session.
 *
 * Placed everywhere `<TrialBanner />` sits — `app/app/layout.tsx` (every
 * `/app/*` page) and `app/account/page.tsx` (its own chrome, outside that
 * layout) — so every authenticated page load is covered.
 *
 * Write-amplification guard: this reads `profiles.timezone` once per mount
 * (a single lightweight column select) and writes only when it is
 * null/empty. Once a value is stored, remounting on further navigation
 * never writes again.
 */
export function TimezoneSync() {
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("timezone")
        .eq("id", user.id)
        .maybeSingle();
      await backfillProfileTimezoneIfMissing(supabase, user.id, profile?.timezone as string | null | undefined);
    });
  }, []);

  return null;
}
