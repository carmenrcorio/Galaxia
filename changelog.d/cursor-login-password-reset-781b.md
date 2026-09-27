## Complete login recovery and navigation (branch `cursor/login-password-reset-781b`) — 2026-09-27

**Trigger**: Visitors landing directly on `/login` could not navigate back to
the marketing site, and the recovery and signup actions were incomplete.

`[ADDED]` Added the shared marketing navigation, an explicit password-reset
email form backed by Supabase Auth, and the free-trial signup link to the login
page so signed-out visitors can recover an account or continue elsewhere.
