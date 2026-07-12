## RLS cross-user hardening (branch `cursor/rls-cross-user-hardening-de65`) — 2026-07-12

**Trigger**: Security audit found service_role and policy paths that could load or write birth/relationship data without confirming the requester owns that data — including data about minors and third parties.

`[FIXED]` **vela-chat IDOR.** Switched the edge function to a user-scoped Supabase client (`SUPABASE_ANON_KEY` + caller JWT) so RLS applies, and added explicit `owner_id = user.id` checks on people/groups before loading charts or expanding group members. Foreign person/group IDs now 404 instead of silently serving.

`[FIXED]` **thread_participants self-enrollment.** INSERT is now owner-only (thread owner). Added UPDATE/DELETE policies so participants can still consent and leave without being able to join someone else's thread.

`[FIXED]` **invite person_id ownership.** Invites RLS `WITH CHECK` and `/api/invite/birth-data` both require `person_id` to belong to `from_user` before any service_role write.

`[FIXED]` **Referenced-people ownership** on `group_members`, `relationships`, and `synastry` INSERT/ALL `WITH CHECK` expressions.

`[FIXED]` Revoked `EXECUTE` on `handle_new_user` and `rls_auto_enable` from `PUBLIC`/`anon`/`authenticated` (triggers still work).
