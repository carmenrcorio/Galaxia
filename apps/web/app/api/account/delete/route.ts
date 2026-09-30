import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  ACCOUNT_DELETE_COPY,
  isDeleteConfirmation
} from "../../../../lib/account-data";
import { missingEnvMessage, publicEnv } from "../../../../lib/env";
import { privateEnv } from "../../../../lib/env.server";
import { createSupabaseClientForRequest } from "../../../../lib/supabase/user-from-request";

export const runtime = "nodejs";

/**
 * Self-serve account deletion.
 *
 * 1) Require typed confirmation ("delete") and the account password.
 * 2) Re-verify password with GoTrue (stolen session alone is not enough).
 * 3) Call purge_user_account() with the service role (authenticated cannot
 *    invoke purge RPCs directly).
 * 4) Best-effort GoTrue deleteUser sweep; sign out the client session.
 *
 * No RevenueCat / Stripe calls. Billing warning is UI-only.
 */
export async function POST(req: Request) {
  if (!publicEnv.supabaseUrl) {
    return NextResponse.json({ error: missingEnvMessage("NEXT_PUBLIC_SUPABASE_URL") }, { status: 503 });
  }
  if (!privateEnv.serviceRole) {
    return NextResponse.json({ error: missingEnvMessage("SUPABASE_SERVICE_ROLE_KEY") }, { status: 503 });
  }
  if (!publicEnv.supabaseAnonKey) {
    return NextResponse.json({ error: missingEnvMessage("NEXT_PUBLIC_SUPABASE_ANON_KEY") }, { status: 503 });
  }

  const { supabase, accessToken } = await createSupabaseClientForRequest(req);
  const {
    data: { user }
  } = await supabase.auth.getUser(accessToken ?? undefined);
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let body: { confirmation?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!isDeleteConfirmation(body.confirmation)) {
    return NextResponse.json(
      { error: 'Type the word "delete" to confirm account deletion.' },
      { status: 400 }
    );
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (!password) {
    return NextResponse.json({ error: ACCOUNT_DELETE_COPY.errorPasswordRequired }, { status: 400 });
  }

  if (!user.email) {
    return NextResponse.json({ error: ACCOUNT_DELETE_COPY.errorPasswordRequired }, { status: 400 });
  }

  const verifyClient = createClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { error: passwordError } = await verifyClient.auth.signInWithPassword({
    email: user.email,
    password
  });
  if (passwordError) {
    return NextResponse.json({ error: ACCOUNT_DELETE_COPY.errorPasswordInvalid }, { status: 401 });
  }

  const admin = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, {
    auth: { persistSession: false }
  });
  const { error: purgeError } = await admin.rpc("purge_user_account", { p_user_id: user.id });
  if (purgeError) {
    return NextResponse.json({ error: ACCOUNT_DELETE_COPY.errorGeneric }, { status: 500 });
  }

  // Login row is already gone in Postgres. GoTrue 404 is the happy path.
  await admin.auth.admin.deleteUser(user.id);

  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
