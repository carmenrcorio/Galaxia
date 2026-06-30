import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./server";

export async function requireUser(nextPath = "/account") {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  return { supabase, user };
}
