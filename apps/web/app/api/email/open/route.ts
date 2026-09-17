import { NextResponse } from "next/server";
import { publicEnv } from "../../../../lib/env";
import { privateEnv } from "../../../../lib/env.server";
import { createClient } from "@supabase/supabase-js";
import { isEmailTrackingId, recordEmailOpenByTrackingId } from "../../../../lib/email-tracking";

export const runtime = "nodejs";

const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

function pixelResponse(): NextResponse {
  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache"
    }
  });
}

/**
 * Open pixel for every Galaxia-sent email that carries a tracking id.
 * Always returns the GIF. Never distinguishes a missing send from a real one.
 */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("t");
  if (!isEmailTrackingId(id) || !publicEnv.supabaseUrl || !privateEnv.serviceRole) {
    return pixelResponse();
  }
  const supabase = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, { auth: { persistSession: false } });
  await recordEmailOpenByTrackingId(supabase, id);
  return pixelResponse();
}
