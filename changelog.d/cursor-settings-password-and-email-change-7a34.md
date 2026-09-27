## Password change and email change in Settings (branch `cursor/settings-password-and-email-change-7a34`) — 2026-09-27

**Trigger**: Settings had no way to change either credential. Password change
existed only as a card on `/account`, and Settings pointed at it with a line of
copy ("Change your password from Account") instead of offering the control.
Email change did not exist on any surface, on web or mobile, so the only way to
move the address you sign in with was to ask support.

`[ADDED]` **An "Account" card on Settings, web and mobile, with two expandable
sections: Change password and Change email.** Both call
`auth.updateUser` against the live session. Password takes a new value plus a
confirmation and enforces the 8-character minimum before the request; email
takes one address and the service mails the confirmation links. The card sits
above the data export and delete controls on both platforms. The password card
on `/account` is unchanged and stays: it is the same flow on another surface,
and the Settings pointer that linked to it is gone now that Settings has the
control itself.

`[ADDED]` **`@galaxia/core/account-credentials`: one rule and one set of strings
for both platforms.** `PASSWORD_MIN_LENGTH`, the hint and error strings,
`checkPasswordChange`, `checkEmailChange`, `emailChangeSentMessage`, and the two
copy objects live here. `apps/web/lib/password-rules.ts` now re-exports them
rather than defining `PASSWORD_MIN_LENGTH = 8` itself, because mobile cannot
import an `apps/web` module and a second hardcoded 8 in a second app is exactly
the drift that file was created to prevent. The minimum matches the minimum
configured on the auth project; raising one without the other would either
promise a password the server refuses or refuse one it accepts.

`[DECISION]` **The email-change confirmation message names both addresses.**
Secure email change is enabled on the auth project
(`mailer_secure_email_change_enabled`), which means a link goes to the current
address as well as the new one and the sign-in email does not move until both
are opened. Copy that mentioned only the new address would have been telling
half the story, so the message is "Check your new email to confirm the change. A
link went to `<new>` and to `<current>`. Your sign-in email changes once both
are open." If that project setting is ever turned off, this string has to change
with it (ENGINEERING.md §12).

`[DECISION]` **No current-password prompt, and no native constraint validation
on these fields.** The auth project has neither
`security_update_password_require_current_password` nor
`security_update_password_require_reauthentication` set, so a live session is
the whole authorization for a password change; the session is re-read
immediately before each write so a card left open outliving its session says
"sign in again" rather than failing vaguely. The inputs deliberately carry no
`required` / `minLength` / `type="email"`: native validation would intercept the
submit and show the browser's own tooltip, which would also mean web and mobile
gave different answers to the same typo. The shared checks own the message, and
the service's own error is shown verbatim (a leaked password it refuses, an
address already registered) rather than collapsed into something generic.

`[OPEN]` New user-visible strings in `packages/core/src/account-credentials.ts`
are tagged `FOUNDER-REVIEW`: `PASSWORD_CHANGE_COPY`, `EMAIL_CHANGE_COPY`, and
the confirmation sentence built by `emailChangeSentMessage`. That covers the two
section labels, the two leads, the two button labels, both submitting labels,
the success and session-expired messages, and the three email validation
errors. `PASSWORD_RULE_HINT`, `PASSWORD_TOO_SHORT_ERROR`, and
`PASSWORD_MISMATCH_ERROR` are deliberately untagged: they moved here word for
word and are already live copy. Remove the tags once approved
(ENGINEERING.md §11).
