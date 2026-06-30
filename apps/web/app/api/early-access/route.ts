import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { privateEnv, publicEnv } from "../../../lib/env";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; source?: string };
    const email = (body.email ?? "").trim().toLowerCase();
    const source = body.source === "hero" || body.source === "close" ? body.source : "hero";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please provide a valid email." }, { status: 400 });
    }

    if (!publicEnv.supabaseUrl || !privateEnv.serviceRole) {
      return NextResponse.json({ error: "Server is missing Supabase configuration." }, { status: 500 });
    }

    const supabase = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, {
      auth: { persistSession: false }
    });

    const { error } = await supabase.from("early_access").upsert(
      {
        email,
        source
      },
      { onConflict: "email" }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
