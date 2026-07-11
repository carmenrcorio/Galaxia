import { hasAccess } from "@galaxia/core";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { publicEnv } from "./lib/env";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }
    }
  });

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  // Login required for the whole authed surface. /subscribe is authed too so a
  // logged-out user can't land there. /start is the post-login resolver — it
  // needs a user to read, then redirects on to /app or /welcome (both gated
  // below), so it is auth-gated but intentionally left out of the entitlement
  // gate.
  const needsAuth =
    path.startsWith("/app") ||
    path.startsWith("/account") ||
    path === "/welcome" ||
    path === "/start" ||
    path === "/subscribe";
  if (!user && needsAuth) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", `${path}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  // Entitlement gate: /app/* and /welcome require an active/lifetime plan or a
  // live trial. /account and /subscribe stay reachable when the trial ends, so
  // the user can always export their data or subscribe. Data is never deleted.
  const accessGated = user && (path.startsWith("/app") || path === "/welcome");
  if (accessGated) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_status, trial_ends_at")
      .eq("id", user.id)
      .maybeSingle();
    // Fail-open only when there is genuinely no profile row yet (the new-user
    // trigger is still settling). A row that exists is trusted.
    if (profile && !hasAccess({ status: profile.subscription_status, trialEndsAt: profile.trial_ends_at })) {
      const url = request.nextUrl.clone();
      url.pathname = "/subscribe";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/app/:path*", "/account/:path*", "/welcome", "/start", "/subscribe"]
};
