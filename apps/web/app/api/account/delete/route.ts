import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  ACCOUNT_DELETE_COPY,
  isDeleteConfirmation
} from "../../../../lib/account-data";
import { missingEnvMessage, privateEnv, publicEnv } from "../../../../lib/env";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";

export const runtime = "nodejs";

/**
 * Self-serve account deletion.
 *
 * 1) Require typed confirmation ("delete").
 * 2) Call purge_own_account_data() (SECURITY DEFINER, one transaction).
 * 3) Only on success: auth.admin.deleteUser.
 *
 * No RevenueCat / Stripe calls. Billing warning is UI-only.
 * If the purge fails, nothing is deleted.
 */
export async function POST(req: Request) {
  if (!publicEnv.supabaseUrl) {
    return NextResponse.json({ error: missingEnvMessage("NEXT_PUBLIC_SUPABASE_URL") }, { status: 503 });
  }
  if (!privateEnv.serviceRole) {
    return NextResponse.json({ error: missingEnvMessage("SUPABASE_SERVICE_ROLE_KEY") }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
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
  const { error: authError } = await admin.auth.admin.deleteUser(user.id);
  if (authError) {
    // Graph is already gone; auth row remains. Surface a clear error so support can finish.
    return NextResponse.json(
      {
        error:
          "Your data was removed, but closing the login failed. Contact support@galaxia.app with this account email."
      },
      { status: 500 }
    );
  }

  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
