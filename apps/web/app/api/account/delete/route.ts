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
 * 1) Require typed confirmation ("delete").
 * 2) Call purge_own_account_data() (SECURITY DEFINER, one transaction).
 *    That function deletes the owned graph AND the auth.users row. If it
 *    fails, nothing is deleted.
 * 3) Best-effort GoTrue deleteUser: the SQL row is already gone, so a 404
 *    is success. This only sweeps GoTrue-side leftovers (sessions already
 *    CASCADE from auth.users).
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

  const { supabase, accessToken } = await createSupabaseClientForRequest(req);
  const {
    data: { user }
  } = await supabase.auth.getUser(accessToken ?? undefined);
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let body: { confirmation?: string };
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

  const { error: purgeError } = await supabase.rpc("purge_own_account_data");
  if (purgeError) {
    return NextResponse.json({ error: ACCOUNT_DELETE_COPY.errorGeneric }, { status: 500 });
  }

  const admin = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, {
    auth: { persistSession: false }
  });
  // Login row is already gone in Postgres. GoTrue 404 is the happy path.
  await admin.auth.admin.deleteUser(user.id);

  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
