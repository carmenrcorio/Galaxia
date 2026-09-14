import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { publicEnv } from "../../../../lib/env";
import { privateEnv } from "../../../../lib/env.server";
import { isLetterTrackingId } from "../../../../lib/constellation-letter-send";

export const runtime = "nodejs";

/** 1x1 transparent GIF. Always returned so a missing id cannot leak validity. */
const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

function pixelResponse(): NextResponse {
  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Pragma": "no-cache"
    }
  });
}

/**
 * Open pixel for the weekly constellation letter. Records the first open
 * (`opened_at`) and increments `open_count`. No session. Never distinguishes
 * a missing letter from a real one in the response.
 */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!isLetterTrackingId(id) || !publicEnv.supabaseUrl || !privateEnv.serviceRole) {
    return pixelResponse();
  }

  const supabase = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, { auth: { persistSession: false } });
  const { data } = await supabase
    .from("constellation_letters")
    .select("id, opened_at, open_count")
    .eq("id", id)
    .maybeSingle();
  if (data?.id) {
    const openedAt = data.opened_at ?? new Date().toISOString();
    await supabase
      .from("constellation_letters")
      .update({ opened_at: openedAt, open_count: (data.open_count ?? 0) + 1 })
      .eq("id", id);
  }
  return pixelResponse();
}
