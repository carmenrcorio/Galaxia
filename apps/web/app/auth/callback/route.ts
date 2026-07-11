import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { publicEnv } from "../../../lib/env";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  // Default to the /start resolver so email-confirm / password-reset logins
  // route returning users to /app and new users to /welcome. An explicit
  // `next` (e.g. a Quick Chart prefill hand-off) is respected as-is.
  const next = requestUrl.searchParams.get("next") ?? "/start";

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

  return response;
}
