import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { publicEnv } from "../../../../lib/env";
import { privateEnv } from "../../../../lib/env.server";
import { isLetterTrackingId } from "../../../../lib/constellation-letter-send";
import { THIS_WEEK_HREF } from "../../../../lib/nav-links";

export const runtime = "nodejs";

function redirectToThisWeek(): NextResponse {
  const origin = publicEnv.siteUrl || "https://galaxia-three.vercel.app";
  return NextResponse.redirect(`${origin}${THIS_WEEK_HREF}`, { status: 302 });
}

/**
 * Click wrapper for the weekly constellation letter CTA. Records the
 * first click (`clicked_at`) and increments `click_count`, then redirects
 * to This Week. Invalid/missing ids still redirect so the response cannot
 * leak whether a letter row exists.
 */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (isLetterTrackingId(id) && publicEnv.supabaseUrl && privateEnv.serviceRole) {
    const supabase = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, { auth: { persistSession: false } });
    const { data } = await supabase
      .from("constellation_letters")
      .select("id, clicked_at, click_count")
      .eq("id", id)
      .maybeSingle();
    if (data?.id) {
      const clickedAt = data.clicked_at ?? new Date().toISOString();
      await supabase
        .from("constellation_letters")
        .update({ clicked_at: clickedAt, click_count: (data.click_count ?? 0) + 1 })
        .eq("id", id);
    }
  }
  return redirectToThisWeek();
}
