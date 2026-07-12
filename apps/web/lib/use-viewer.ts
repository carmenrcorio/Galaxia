"use client";

/**
 * useViewer — the one client-side hook that answers "who is looking at this
 * public Quick Chart page, and what are they entitled to?"
 *
 * Quick Chart (/chart, /chart/compare) is a public route with no server auth
 * guard, so recognition of a logged-in visitor happens client-side using the
 * exact pattern the rest of the app already uses (createSupabaseBrowserClient +
 * auth.getUser + a profiles/people read — see TrialBanner, SaveToGalaxyButton,
 * and /chart/compare's own prefill). Consolidating it here means /chart and
 * /chart/compare recognize the user identically instead of each re-deriving it.
 *
 * `isSubscriber` is the real entitlement (@galaxia/core hasAccess) — true only
 * for active/lifetime or a trial that has not ended. It is never a hardcoded
 * flag; it gates the paid PDF export.
 *
 * The logged-out result (userId null, isSubscriber false, no self prefill) is
 * the default while loading and forever for anonymous visitors, so the public
 * funnel is untouched: nothing here fires unless a real session is found.
 */

import {
  type NatalChart,
  type BirthFormInput,
} from "@galaxia/astro";
import { hasAccess } from "@galaxia/core";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "./supabase/client";

export interface Viewer {
  /** True until the auth/profile round trip settles. Anonymous chrome renders during this window (see doc comment). */
  loading: boolean;
  userId: string | null;
  subscriptionStatus: string | null;
  trialEndsAt: string | null;
  /** Real entitlement (active/lifetime/live trial). Gates the paid PDF export. */
  isSubscriber: boolean;
  /** The user's own birth data as a BirthFields input, for pre-fill. Null if no self / progressive-capture only. */
  selfInput: BirthFormInput | null;
  /** The user's own stored natal chart. Null if none computed yet. */
  selfChart: NatalChart | null;
  selfName: string | null;
}

const ANON: Viewer = {
  loading: false,
  userId: null,
  subscriptionStatus: null,
  trialEndsAt: null,
  isSubscriber: false,
  selfInput: null,
  selfChart: null,
  selfName: null,
};

function parseDateStr(s: string | null | undefined): { month?: number; day?: number; year?: number } {
  if (!s) return {};
  const [yr, mo, dy] = s.slice(0, 10).split("-").map(Number);
  return { year: yr, month: mo, day: dy };
}
function parseTimeStr(s: string | null | undefined): { hour?: number; minute?: number } {
  if (!s) return {};
  const [hr, mn] = s.slice(0, 5).split(":").map(Number);
  return { hour: hr, minute: mn };
}

export function useViewer(): Viewer {
  const [viewer, setViewer] = useState<Viewer>({ ...ANON, loading: true });

  useEffect(() => {
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { if (!cancelled) setViewer(ANON); return; }

      const [{ data: profile }, { data: self }] = await Promise.all([
        supabase.from("profiles").select("subscription_status, trial_ends_at").eq("id", user.id).maybeSingle(),
        // A unique index on people(owner_id) WHERE is_self guarantees at most one row.
        supabase.from("people")
          .select("id, display_name, birth_date, birth_time, birth_place, birth_lat, birth_lng, tz_offset_min, birth_precision")
          .eq("owner_id", user.id).eq("is_self", true).maybeSingle(),
      ]);

      let selfInput: BirthFormInput | null = null;
      let selfChart: NatalChart | null = null;
      if (self && self.birth_precision && self.birth_precision !== "none") {
        selfInput = {
          precision: self.birth_precision as BirthFormInput["precision"],
          ...parseDateStr(self.birth_date as string | null),
          ...parseTimeStr(self.birth_time as string | null),
          lat: self.birth_lat != null ? String(self.birth_lat) : "",
          lng: self.birth_lng != null ? String(self.birth_lng) : "",
          tzOffsetMin: (self.tz_offset_min as number | null) ?? undefined,
          birthPlace: (self.birth_place as string | null) ?? "",
        };
        const { data: chartRow } = await supabase.from("charts").select("data").eq("person_id", self.id).maybeSingle();
        selfChart = (chartRow?.data as NatalChart) ?? null;
      }

      const subscriptionStatus = (profile?.subscription_status as string | null) ?? null;
      const trialEndsAt = (profile?.trial_ends_at as string | null) ?? null;

      if (cancelled) return;
      setViewer({
        loading: false,
        userId: user.id,
        subscriptionStatus,
        trialEndsAt,
        isSubscriber: hasAccess({ status: subscriptionStatus, trialEndsAt }),
        selfInput,
        selfChart,
        selfName: (self?.display_name as string | null) ?? null,
      });
    });
    return () => { cancelled = true; };
  }, []);

  return viewer;
}
