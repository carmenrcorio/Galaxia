import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { syncSignupNameToProfile } from "../../../lib/account-name";
import { publicEnv } from "../../../lib/env";
import { safeNextPath } from "../../../lib/safe-next-path";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  // Default to the /start resolver so email-confirm / password-reset logins
  // route returning users to /app and new users to /welcome. An explicit
  // `next` (e.g. a Quick Chart prefill hand-off) is respected only once it
  // has passed safeNextPath — this is a real HTTP redirect, so an
  // unvalidated `next` here is a same-origin-authenticated open redirect.
  const next = safeNextPath(requestUrl.searchParams.get("next"));

  let response = NextResponse.redirect(new URL(next, request.url));
  const supabase = createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.redirect(new URL(next, request.url));
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }
    }
  });

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }
  if (tokenHash && (type === "recovery" || type === "email")) {
    await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType });
  }

  // First authenticated moment after an email confirmation, which is the only
  // point where a name collected at signup can reach `profiles`. No-op unless
  // signup captured a name and the profile has none.
  const {
    data: { user }
  } = await supabase.auth.getUser();
  await syncSignupNameToProfile(supabase, user);

  return response;
}
