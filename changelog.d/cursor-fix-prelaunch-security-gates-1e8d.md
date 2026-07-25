## Pre-launch security gates: vela-chat entitlement + mobile route lockout (branch `cursor/fix-prelaunch-security-gates-1e8d`) — 2026-07-25

**Trigger**: Phase 0 diagnosis of pre-launch auth/entitlement gaps. Gates 3 (PDF) and 4 (group minor client UX) removed from scope; close Gate 2 then Gate 1.

`[SECURITY]` **Gate 2 — vela-chat entitlement, fail closed.** After JWT `getUser`, before any thread/chat/Anthropic work, load `profiles` (`subscription_status`, `trial_ends_at`, `comped`) and require `@galaxia/core` `hasAccess` via `profileAllowsAccess`. Missing row or unentitled → **403**, no stream. Minor/shared-mode gates untouched.

`[CHANGED]` **`hasAccess` extracted to `packages/core/src/has-access.ts`.** One module for web middleware, mobile `EntitlementProvider` / route guard, and vela-chat. Edge imports `./has-access.ts`, a **symlink** to the core file (no inline fork). FOUNDER-REVIEW on `VELA_ENTITLEMENT_REQUIRED_ERROR`.

`[SECURITY]` **Gate 1 — mobile structural route lockout.** Authed tree under `app/(app)/` with `_layout.tsx` using `resolveAuthedRouteGate`: `!session → /`, `!hasAccess → /subscribe`. Public `/` is sign-in only (redirects entitled → `/home`). New `/subscribe` paywall surface (FOUNDER-REVIEW copy; billing remains web-first). Soft feature banners (`canUseGroups`, etc.) stay; dead people-cap shim left as-is.

`[UNCHANGED]` **Web `middleware.ts`** already gates `/app/*` + `/welcome` with the same `@galaxia/core` `hasAccess` — no parallel rule.

`[TEST]` Core: unentitled/missing profile deny; edge wiring (403 before thread/Anthropic, symlink, minor gate intact). Mobile: unauth → `/`, unentitled → `/subscribe`, entitled → allow/`/home`.

**After merge:** `ship.sh`; **edge redeploy required for Gate 2** (CI Deploy Edge Functions). MERGED IS NOT LIVE. Phone-verify: signed-out deep link → `/`; unentitled → paywall + Vela 403; entitled/comped → tree + Vela stream.
