/**
 * The password rule, in one place, so the signup form and the authenticated
 * change-password control cannot drift apart.
 *
 * This is not a new rule. It is exactly what the signup form already enforced
 * inline (`required minLength={6}`), lifted out so the change-password control
 * matches it by construction rather than by a second hardcoded 6 that someone
 * has to remember to keep in sync. Do not tighten it here alone: raising the
 * minimum without raising it in the Supabase project's auth settings would let
 * signup accept a password the server rejects, or the reverse.
 */
export const PASSWORD_MIN_LENGTH = 6;

/** FOUNDER-REVIEW: authored password hint shown under password fields. */
export const PASSWORD_RULE_HINT = `At least ${PASSWORD_MIN_LENGTH} characters.`;

/** FOUNDER-REVIEW: authored error shown when a password is too short. */
export const PASSWORD_TOO_SHORT_ERROR = `That password is too short. Use at least ${PASSWORD_MIN_LENGTH} characters.`;

/** FOUNDER-REVIEW: authored error shown when the two password fields disagree. */
export const PASSWORD_MISMATCH_ERROR = "Those two passwords do not match. Retype them and try again.";
