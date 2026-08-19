## Password minimum raised from 6 to 8 (branch `cursor/raise-password-minimum-52d5`) — 2026-08-19

**Trigger**: Last item on the P1 security list. `lib/password-rules.ts` already warned that raising the client minimum alone would create a mismatch with the Supabase project's own auth minimum, so both had to move together.

`[CHANGED]` **`PASSWORD_MIN_LENGTH` raised from `6` to `8`** in `apps/web/lib/password-rules.ts`. Signup and change-password both import this single constant (never restate it), so `PASSWORD_RULE_HINT` ("At least 8 characters.") and `PASSWORD_TOO_SHORT_ERROR` update by reference on both surfaces with no other code change needed.

`[OPEN]` **Supabase dashboard: Authentication → password settings minimum length still needs to be raised to 8 to match.** As of this fragment, the live project's server-side minimum is still 6 (confirmed by a direct `POST /auth/v1/signup` call, which accepted a 6-character password and only rejected 5-character), because that setting requires dashboard/Management API access this agent does not have. Until a founder raises it, the client is the stricter of the two (blocks 6- and 7-character passwords the server would still accept), which cannot break signup, but the two minimums remain out of sync until that dashboard action happens. Leaked-password protection, `hasAccess`, and the entitlement gate were not touched.
