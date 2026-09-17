import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "../env";
import { accessTokenFromAuthorizationHeader } from "./access-token";
import { createSupabaseServerClient } from "./server";

/**
 * Session client for account routes.
 *
 * Mobile sends the user's Supabase JWT (`Authorization: Bearer`). Web
 * AccountDataPanel uses the cookie session. Bearer wins when both are present
 * so a stolen cookie cannot override an explicit user JWT. `getUser` still
 * validates the JWT with GoTrue; a forged token is an anonymous request.
 */
export async function createSupabaseClientForRequest(req: Request) {
  const accessToken = accessTokenFromAuthorizationHeader(req.headers.get("authorization"));
  if (accessToken) {
    const supabase = createClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } }
    });
    return { supabase, accessToken };
  }
  return { supabase: await createSupabaseServerClient(), accessToken: null };
}
