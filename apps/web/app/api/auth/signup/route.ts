import { joinFullName } from "@galaxia/core";
import { NextResponse } from "next/server";
import { AGE_CONFIRMATION_REQUIRED, hasAgeConfirmation } from "../../../../lib/age-attestation";
import { getSiteUrlFromRequestOrigin, missingEnvMessage, publicEnv } from "../../../../lib/env";
import { safeNextPath } from "../../../../lib/safe-next-path";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";

export const runtime = "nodejs";

type SignupBody = {
  age_confirmed?: unknown;
  email?: unknown;
  password?: unknown;
  first_name?: unknown;
  last_name?: unknown;
  full_name?: unknown;
  next?: unknown;
};

/**
 * Email signup and the constellation-connect logged-out path both POST here
 * (connect is `/signup?next=/connect/<token>` using the same SignupForm).
 * There is no separate OAuth signup route.
 */
export async function POST(request: Request) {
  let body: SignupBody;
  try {
    body = (await request.json()) as SignupBody;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!hasAgeConfirmation(body)) {
    return NextResponse.json({ error: AGE_CONFIRMATION_REQUIRED }, { status: 400 });
  }

  if (!publicEnv.supabaseUrl) {
    return NextResponse.json({ error: missingEnvMessage("NEXT_PUBLIC_SUPABASE_URL") }, { status: 500 });
  }
  if (!publicEnv.supabaseAnonKey) {
    return NextResponse.json({ error: missingEnvMessage("NEXT_PUBLIC_SUPABASE_ANON_KEY") }, { status: 500 });
  }

  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";
  const firstName = typeof body.first_name === "string" ? body.first_name : "";
  const lastName = typeof body.last_name === "string" ? body.last_name : "";
  const nextPath = typeof body.next === "string" ? body.next : undefined;

  const origin = request.headers.get("origin") ?? undefined;
  const siteUrl = getSiteUrlFromRequestOrigin(origin);
  if (!siteUrl) {
    return NextResponse.json({ error: missingEnvMessage("NEXT_PUBLIC_SITE_URL") }, { status: 500 });
  }
  const redirectUrl = new URL(`${siteUrl}/auth/callback`);
  if (nextPath) redirectUrl.searchParams.set("next", safeNextPath(nextPath, "/welcome"));

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl.toString(),
      data: {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        full_name: joinFullName(firstName, lastName)
      }
    }
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ user: data.user, session: data.session });
}
