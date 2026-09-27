/**
 * The password rule, re-exported from `@galaxia/core` so the signup form, the
 * authenticated change-password control on `/account`, and the mobile Settings
 * screen all read one value.
 *
 * It used to be defined here. Mobile could not import an `apps/web` module, so
 * adding the password change to mobile Settings would have meant a second
 * hardcoded 8 in a second app. The definition moved to
 * `@galaxia/core/account-credentials`; this file stays as the import path the
 * web components already use. Do not redefine any of these here.
 */
export {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MISMATCH_ERROR,
  PASSWORD_RULE_HINT,
  PASSWORD_TOO_SHORT_ERROR
} from "@galaxia/core";
