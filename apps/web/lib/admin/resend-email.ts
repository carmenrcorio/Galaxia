import { createClient } from "@supabase/supabase-js";

/**
 * Which real email the target user needs, decided from their own auth
 * state — never a single generic email sent regardless of state.
 *   - "confirmation": the signup was never confirmed (`email_confirmed_at`
 *     is null). Resending anything else (a password reset) would be wrong
 *     for this user — they have no confirmed account to reset into yet.
 *   - "reset": the account is confirmed; a password reset is the only safe
 *     "help them get back in" email for an already-active account.
 */
export type ResendEmailType = "confirmation" | "reset";

export interface ResendEmailAuthUser {
  email?: string | null;
  email_confirmed_at?: string | null;
}

/**
 * Pure branch decision — no network, no Supabase client — so it is
 * directly unit-testable without live credentials. `resendUserEmail` below
 * is the only caller in production; tests exercise this in isolation to
 * prove the branch itself, and `resendUserEmail`'s own live test proves the
 * branch is actually reached with a real auth user's shape.
 */
export function determineResendEmailType(authUser: ResendEmailAuthUser): ResendEmailType {
  return authUser.email_confirmed_at ? "reset" : "confirmation";
}

export interface ResendUserEmailResult {
  emailType: ResendEmailType;
  email: string;
}

/**
 * Looks up the target user via the Supabase Auth Admin API, branches on
 * `email_confirmed_at`, and sends the matching real email:
 *   - unconfirmed -> `auth.resend({ type: "signup" })`, GoTrue's own resend
 *     endpoint for an existing-but-unconfirmed signup (actually sends,
 *     unlike `auth.admin.generateLink`, which only mints a link and never
 *     emails it).
 *   - confirmed -> `auth.resetPasswordForEmail`, the same call
 *     `login-form.tsx`'s "forgot password" flow uses for a signed-out user.
 * Both calls are made against a service-role-keyed client, but neither is
 * actually an `auth.admin.*` privileged call — they're the same public
 * GoTrue endpoints a signed-out browser can reach; running them
 * server-side here is what lets an admin trigger them for a user who isn't
 * present to trigger them for themselves.
 *
 * Takes `supabaseUrl`/`serviceRoleKey` as parameters (mirrors
 * `listAdminUsers`'s signature) rather than importing `env.server.ts`
 * itself, and does not import `server-only` — this keeps it directly
 * testable against the live project the same way `read-admin-row.ts` is,
 * per that file's own documented trade-off. It must still only ever be
 * called from a server context (the `/api/admin/users/[id]/resend-email`
 * route, guarded by `requireAdminApi()`); nothing client-importable
 * references this module.
 */
export async function resendUserEmail(
  supabaseUrl: string,
  serviceRoleKey: string,
  userId: string,
  redirectTo?: string
): Promise<ResendUserEmailResult> {
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data?.user) {
    throw new Error("User not found.");
  }
  const authUser = data.user;
  if (!authUser.email) {
    throw new Error("This user has no email on file.");
  }

  const emailType = determineResendEmailType(authUser);

  if (emailType === "confirmation") {
    const { error: resendError } = await admin.auth.resend({
      type: "signup",
      email: authUser.email,
      options: redirectTo ? { emailRedirectTo: redirectTo } : undefined
    });
    if (resendError) throw new Error(resendError.message);
  } else {
    const { error: recoveryError } = await admin.auth.resetPasswordForEmail(
      authUser.email,
      redirectTo ? { redirectTo } : undefined
    );
    if (recoveryError) throw new Error(recoveryError.message);
  }

  return { emailType, email: authUser.email };
}
