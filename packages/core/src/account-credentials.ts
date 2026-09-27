/**
 * Changing the password and the email on a signed-in account (pure / shared).
 *
 * Web and mobile both import this, so the rule and the copy cannot drift
 * between the two Settings screens. Nothing here talks to the network: the
 * caller owns the `auth.updateUser` call and hands the result back to the
 * messages below.
 *
 * Two facts about the live auth project are load-bearing here, and the copy
 * depends on both (ENGINEERING.md §12: say what is actually true):
 *
 * 1. A password change needs only a live session. Neither the current password
 *    nor a re-authentication step is required, so a session-authenticated
 *    change is one call with no second factor.
 * 2. An email change is confirmed from **both** addresses. Secure email change
 *    is on, which means a link goes to the current address as well as the new
 *    one, and the sign-in email does not move until both are opened. Copy that
 *    mentions only the new address would be telling half the story.
 */

/**
 * The password rule, in one place.
 *
 * This matches the minimum configured on the auth project itself. Do not raise
 * it here alone: a client minimum above the server's would reject a password
 * the server accepts, and one below it would promise a password the server
 * refuses.
 */
export const PASSWORD_MIN_LENGTH = 8;

/**
 * These three strings are not new copy and are not tagged for review. They
 * moved here word for word from `apps/web/lib/password-rules.ts`, which now
 * re-exports them, so that the mobile screen shows the same sentences the web
 * signup form and `/account` password card already showed.
 */

/** Hint under every new-password field (signup and change). */
export const PASSWORD_RULE_HINT = `At least ${PASSWORD_MIN_LENGTH} characters.`;

/** Local check, shown before any request is made. */
export const PASSWORD_TOO_SHORT_ERROR = `That password is too short. Use at least ${PASSWORD_MIN_LENGTH} characters.`;

/** Local check, shown before any request is made. */
export const PASSWORD_MISMATCH_ERROR =
  "Those two passwords do not match. Retype them and try again.";

/** FOUNDER-REVIEW: password change section on Settings, web and mobile. */
export const PASSWORD_CHANGE_COPY = {
  sectionLabel: "Change password",
  lead: "Set a new password for this account. You stay signed in on this device.",
  newLabel: "New password",
  confirmLabel: "Confirm new password",
  submit: "Update password",
  submitting: "Updating password...",
  success: "Password updated. Use the new one next time you sign in.",
  sessionExpired:
    "Your session has ended, so your password could not be changed. Sign in again and try once more."
} as const;

/** FOUNDER-REVIEW: email change section on Settings, web and mobile. */
export const EMAIL_CHANGE_COPY = {
  sectionLabel: "Change email",
  lead:
    "A confirmation link goes to your current address and to the new one. Your sign-in email stays the same until both links are opened.",
  newLabel: "New email address",
  submit: "Update email",
  submitting: "Sending confirmation...",
  emptyError: "Enter the email address you want to use.",
  invalidError: "That does not look like an email address. Check it and try again.",
  sameEmailError: "That is already the email on this account.",
  sessionExpired:
    "Your session has ended, so your email could not be changed. Sign in again and try once more."
} as const;

/**
 * Local shape check only. The auth service is the authority on whether an
 * address is deliverable, and its answer is shown verbatim when it disagrees.
 * This exists so an obvious typo gets an answer without a round trip.
 */
export function isLikelyEmailAddress(value: string | null | undefined): boolean {
  const email = (value ?? "").trim();
  if (!email || /\s/.test(email)) return false;
  const at = email.indexOf("@");
  if (at <= 0 || at !== email.lastIndexOf("@")) return false;
  const domain = email.slice(at + 1);
  if (!domain.includes(".") || domain.startsWith(".") || domain.endsWith(".")) return false;
  if (domain.includes("..")) return false;
  const tld = domain.slice(domain.lastIndexOf(".") + 1);
  return tld.length >= 2;
}

/**
 * The `error?: undefined` / `email?: undefined` members are not decoration.
 * `apps/web` compiles with `strict: false`, where a discriminated union is not
 * narrowed by a boolean literal, so a property that exists on only one member
 * is a type error at the call site. Declaring it on both members keeps these
 * results usable from web and from the strict packages alike.
 */
export type CredentialCheck =
  | { ok: true; error?: undefined }
  | { ok: false; error: string };

/**
 * The two checks made before a password write: long enough, and typed the same
 * way twice. Everything else (a leaked password the service refuses, an
 * expired session) is the service's answer to report, not ours to guess.
 */
export function checkPasswordChange(
  newPassword: string,
  confirmPassword: string
): CredentialCheck {
  if (newPassword.length < PASSWORD_MIN_LENGTH) {
    return { ok: false, error: PASSWORD_TOO_SHORT_ERROR };
  }
  if (newPassword !== confirmPassword) {
    return { ok: false, error: PASSWORD_MISMATCH_ERROR };
  }
  return { ok: true };
}

export type EmailChangeCheck =
  | { ok: true; email: string; error?: undefined }
  | { ok: false; email?: undefined; error: string };

/**
 * Trims and lower-cases the requested address, then rejects the three cases
 * that need no request: empty, not an email, and the address already in use on
 * this account.
 */
export function checkEmailChange(
  nextEmail: string,
  currentEmail?: string | null
): EmailChangeCheck {
  const email = nextEmail.trim().toLowerCase();
  if (!email) return { ok: false, error: EMAIL_CHANGE_COPY.emptyError };
  if (!isLikelyEmailAddress(email)) {
    return { ok: false, error: EMAIL_CHANGE_COPY.invalidError };
  }
  const current = (currentEmail ?? "").trim().toLowerCase();
  if (current && current === email) {
    return { ok: false, error: EMAIL_CHANGE_COPY.sameEmailError };
  }
  return { ok: true, email };
}

/**
 * FOUNDER-REVIEW: shown after `auth.updateUser({ email })` succeeds.
 *
 * Names both addresses because both have to be confirmed (see the note at the
 * top of this file). When the current address is not known to the caller the
 * sentence still says a second link exists rather than implying one email is
 * all it takes.
 */
export function emailChangeSentMessage(
  nextEmail: string,
  currentEmail?: string | null
): string {
  const target = nextEmail.trim().toLowerCase();
  const current = (currentEmail ?? "").trim().toLowerCase();
  const secondPlace = current ? current : "your current address";
  return `Check your new email to confirm the change. A link went to ${target} and to ${secondPlace}. Your sign-in email changes once both are open.`;
}
