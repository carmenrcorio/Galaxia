## Nudge delivery Phase A: capture user timezone (branch `feat/user-timezone-capture`) — 2026-08-20

**Trigger**: the server-side nudge job (Phase B) cannot compute the correct owner-local calendar day without a stored per-user timezone — `ownerLocalDate()` uses the runtime's local tz today, which is correct by accident on a browser and wrong for everyone on a server cron. This phase captures and stores an IANA timezone per user so Phase B has the one new input it needs; it does not touch `ownerLocalDate()`, the selection engine, `precision_mode`, `isMinorForSafety`, or copy.

**Phase 0 — confirmed before writing code:**
- No current-residence timezone field existed on `profiles`. `people.tz_offset_min` is a birth-place UTC offset in minutes, resolved once at chart-entry time for natal chart math — per-person, not per-account, and unrelated to "what day is it right now for the owner."
- `authenticated` could write only `id`, `display_name`, `house_system` on `profiles` (`20260724180000_comped_entitlement_and_profile_column_grants.sql`); a new client-writable column needs to join that grant list.

`[ADDED]` **`profiles.timezone text`** (migration `20260726010000_profiles_timezone_capture.sql`, Galaxia `eigfvribtntbxyjutsma`). Nullable, no default — existing accounts start null and are backfilled on next app load. Added to the existing owner-controlled column grant: `grant insert/update (id, display_name, house_system, timezone) ... to authenticated`. No new RLS policy — the existing owner-scoped `profiles` policies (`id = auth.uid()`) already cover it.

`[ADDED]` **`profiles_validate_timezone` trigger** — `BEFORE INSERT OR UPDATE`, rejects any non-null `timezone` that isn't a real zone in `pg_catalog.pg_timezone_names`. Server-side backstop behind the client-side `Intl` round-trip guard, so a malformed value can never reach Phase B's date math. `search_path` pinned per the Supabase advisor (mirrors `handle_new_user`'s existing pattern).

`[ADDED]` **`@galaxia/core` `validateIanaTimezone` / `shouldBackfillTimezone`** — the shared, unit-tested decision logic (IANA round-trip check + "only write when null") so web and mobile can't drift on the null-guard.

`[ADDED]` **Capture points:**
- `apps/web/components/timezone-sync.tsx` (new, effect-only, no UI) — mirrors `TrialBanner`'s mount → `getUser` → own-row pattern. Mounted everywhere `<TrialBanner />` sits: `app/app/layout.tsx` (every `/app/*` page) and `app/account/page.tsx`. Reads `profiles.timezone` once per mount; writes the `Intl`-resolved zone only when null.
- `apps/web/components/signup-form.tsx` — bonus piggyback next to the existing `syncSignupNameToProfile` call, only when `signUp` returns an immediate session (email confirmation usually defers this — `TimezoneSync` is the real mechanism, not this).
- `apps/mobile/app/(app)/home.tsx` — same null-guard, reusing the profile row `loadHome` already fetches (added `timezone` to its existing `select`) instead of an extra query. **Typecheck-only in this VM per `AGENTS.md`** (Expo web target doesn't render here) — needs device verification.

`[VERIFIED — live DB, project `eigfvribtntbxyjutsma`]`:
- `apps/web/lib/profile-timezone-capture-verify.test.ts` (new "VERIFY (live DB)" suite, same pattern as `person-daily-nudges-concurrency.test.ts`): a user can write their own valid IANA timezone; a user **cannot** write another user's timezone (RLS); a malformed value is **rejected** by the trigger; null remains valid.
- Manual walkthrough against the running app with a throwaway account: logged in, loaded `/app` (backfilled null → `"UTC"`, the sandbox's real `Intl` zone), navigated to `/app/settings` and back, then hard-reloaded twice. Postgrest edge logs for that account show exactly **one** `PATCH /rest/v1/profiles` across the whole session, and a fresh `GET ?select=timezone` after the value was already set correctly issued no follow-up write — the write-amplification guard holds across both SPA navigation (layout stays mounted, effect doesn't re-run) and full reloads (effect reruns, reads the stored value, no-ops). Test account and data cleaned up afterward.
- `packages/core/test/timezone.test.ts` + `apps/web/lib/timezone.test.ts` (mocked Supabase client, call-count assertions) + `apps/web/lib/timezone-wiring.test.ts` (source-level guards, including "no capture-point file touches `buildPersonDailyNudge`/`copy_resolved`/`precision_mode`/`isMinorForSafety`" and "`ownerLocalDate`'s signature is unchanged").
- `pnpm typecheck` passes across all six packages (web + mobile included).

`[KNOWN OPEN — deliberately out of scope]` Phase A never overwrites an already-stored value, so a traveling user's changed tz is not chased — that's Phase B/future work, per the ticket. Mobile needs a real-device pass (Metro/web target can't render in this VM). Phase B (server nudge job threading this timezone through `ownerLocalDate()`) is untouched by design.
