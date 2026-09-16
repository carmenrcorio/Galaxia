import { DEFAULT_FETCH_TIMEOUT_MS, withTimeout } from "@galaxia/core";
import type { Session } from "@supabase/supabase-js";
import { siteUrlFor } from "./env";

/**
 * FOUNDER-REVIEW: shown when POST /api/auth/signup returns 400
 * "Age confirmation required", and when Create account is pressed
 * without the age-gate checkbox (the button is already disabled).
 */
export const AGE_GATE_REJECTED_MESSAGE =
  "Please confirm you are 18 or older to continue.";

export const AGE_CONFIRMATION_REQUIRED = "Age confirmation required";

const CREATE_ACCOUNT_FAILED = "Could not create account.";

export type SignupViaServerResult =
  | { ok: true; session: Session | null }
  | { ok: false; error: string };

/**
 * Mobile account creation goes through the same server-side COPPA gate as
 * web: POST /api/auth/signup with `age_confirmed: true`. A direct client
 * auth signup call bypasses that check.
 *
 * The checkbox boolean is the only source of `age_confirmed`. If it is not
 * true, this function does not send the request.
 */
export async function signupViaServer(input: {
  email: string;
  password: string;
  ageConfirmed: boolean;
}): Promise<SignupViaServerResult> {
  if (!input.ageConfirmed) {
    return { ok: false, error: AGE_GATE_REJECTED_MESSAGE };
  }

  let response: Response;
  try {
    response = await withTimeout(
      fetch(siteUrlFor("api/auth/signup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: input.email,
          password: input.password,
          age_confirmed: input.ageConfirmed
        })
      }),
      DEFAULT_FETCH_TIMEOUT_MS
    );
  } catch (err) {
    if (err instanceof Error && err.message.includes("EXPO_PUBLIC_SITE_URL")) {
      console.error(err.message);
    }
    return { ok: false, error: CREATE_ACCOUNT_FAILED };
  }

  let payload: { error?: string; session?: Session | null } = {};
  try {
    payload = (await response.json()) as typeof payload;
  } catch {
    payload = { error: CREATE_ACCOUNT_FAILED };
  }

  if (!response.ok) {
    const message = payload.error ?? CREATE_ACCOUNT_FAILED;
    if (response.status === 400 && message === AGE_CONFIRMATION_REQUIRED) {
      return { ok: false, error: AGE_GATE_REJECTED_MESSAGE };
    }
    return { ok: false, error: message };
  }

  return { ok: true, session: payload.session ?? null };
}
