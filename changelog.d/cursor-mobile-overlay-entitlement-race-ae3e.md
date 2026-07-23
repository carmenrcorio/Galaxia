## Mobile Groups: ungated local overlay on load (branch `cursor/mobile-overlay-entitlement-race-ae3e`) - 2026-07-23

**Trigger**: Mobile auto-built the cohort overlay on saved-group load, but still required `canUseGroups`. `hasAccess` defaults false until the profile refreshes, so a fast tap after app open silently cleared the overlay for a paying user. That is a state race, not a paywall. Web never gated local overlay compute.

`[FIXED]` **Local overlay compute is ungated on mobile.** `loadGroup` builds when `ids.length >= 3`; `buildOverlay` no longer early-returns on `canUseGroups`. Overlay is client-side from charts the user already has.

`[CONFIRMED UNTOUCHED]` **Save gating stays.** `saveGroup` still checks `canUseGroups`. Entitlement banner and Galaxia+ copy unchanged. `isMinorForSafety` untouched on all group surfaces.

`[OPEN]` **vela-chat on `eigfvribtntbxyjutsma` is stale (deployed v10).** Live function lacks the #74 group cohort context and `group_id` private-notes filter present on main. Edge does not ship on merge. Deploy when approved (do not run without go-ahead):

```bash
supabase functions deploy vela-chat --project-ref eigfvribtntbxyjutsma --no-verify-jwt
```

(or redeploy via Supabase MCP `deploy_edge_function` with the same `verify_jwt: false` the live function already uses).
