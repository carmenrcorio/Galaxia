## Quarantine the six live-DB tests out of the default suite (branch `cursor/quarantine-live-db-tests-e163`) — 2026-08-25

**Trigger**: Phase 0 diagnosis found `comp-verify.test.ts` was not an isolated
incident — six `lib/**/*.test.ts` files construct a real Supabase client
(`createClient` with `SUPABASE_SERVICE_ROLE_KEY`) and are collected by the
default `pnpm --filter web test` / `pnpm test` glob, all resolving to the
single Supabase project that exists (`eigfvribtntbxyjutsma`, prod — there is
no separate test project). No CI workflow currently runs `pnpm test`, so the
exposure is any local/agent shell that happens to have those three env vars
sourced, which this cloud VM's own environment does.

`[ADDED]` **`apps/web/lib/test-utils/assert-not-prod.ts`** —
`assertDisposableDbTarget(url)`, the shared structural backstop. Throws
`ProdDbGuardError` and aborts unless the resolved Supabase URL is non-empty,
resolves to a real `*.supabase.co` project, is **not** the prod ref
`eigfvribtntbxyjutsma`, and is explicitly named by
`ALLOW_LIVE_DB_TESTS_AGAINST` (which itself can never equal the prod ref).
Fails closed by construction — independent of which vitest config collects a
file, so a future live test landing in the wrong glob still can't reach prod.
Unit-tested with no network I/O in `assert-not-prod.test.ts` (9 cases: empty
URL, malformed URL, prod ref with/without a forged opt-in, missing opt-in,
mismatched opt-in, and the success path).

`[CHANGED]` **All six live-DB test files renamed `*.test.ts` -> `*.live.test.ts`
and now call the guard before constructing any client:**
`lib/admin/comp-verify.live.test.ts`, `lib/admin/resend-email-verify.live.test.ts`,
`lib/admin/support-requests-verify.live.test.ts`,
`lib/profile-timezone-capture-verify.live.test.ts`, `lib/read-admin-row.live.test.ts`,
`lib/person-daily-nudges-concurrency.live.test.ts`. Each file's old
`hasLiveCreds` / `describe.skipIf` / `console.warn`-skip pattern is replaced
by an unconditional `assertDisposableDbTarget(SUPABASE_URL)` call at module
load — running any of these files now either aborts loudly or genuinely
executes against an allow-listed disposable project; it never silently skips.

`[CHANGED]` **`apps/web/vitest.config.ts`** excludes `**/*.live.test.ts`
(`exclude: [...configDefaults.exclude, "**/*.live.test.ts"]`) — the default
suite no longer discovers or requires credentials for any of the six.
**`apps/web/vitest.live.config.ts`** (new) discovers only `lib/**/*.live.test.ts`,
via a new **`test:live`** script in `apps/web/package.json`
(`vitest run --config vitest.live.config.ts`). Chose the rename + dedicated
glob/config over a shared-config-with-project-split because it makes the
quarantine visible in the filename itself (`git ls-files '*.live.test.ts'`
enumerates the exact blast-radius list) and needs no per-file config
annotations.

`[CHANGED]` **`turbo.json`**: removed the `env` array
(`SUPABASE_URL`/`SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY`/
`NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`) from the `test`
task. Those vars no longer affect the default task's output, so hashing them
into its cache key was both unnecessary and would have caused spurious cache
misses. `test:live` is intentionally invoked directly via
`pnpm --filter web test:live`, not through a turbo task, so it stays outside
the cached/orchestrated default pipeline entirely — matching its opt-in,
today-always-aborts nature (see below).

`[ADDED]` **`test:live` stays dormant until a disposable project exists.**
No throwaway/branch Supabase project exists in this account yet (only
`eigfvribtntbxyjutsma`), so running `test:live` today — with the real
project's credentials in the environment — is *expected* to abort on every
file via the prod-ref check, before any client is constructed or any row is
touched. It becomes usable the moment a disposable project is provisioned
and `ALLOW_LIVE_DB_TESTS_AGAINST=<that-ref>` is set alongside credentials
pointed at it.

**Verified**:
- `pnpm --filter web test` (and root `pnpm test`, all 6 packages via turbo) —
  green with `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` /
  `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_URL` / `SUPABASE_ANON_KEY` all
  unset: 32 files / 389 tests in `@galaxia/web` (was 37/412 before removing
  the six; the six moved out plus the new guard's own 9-test unit file net
  to 32/389), 10/10 turbo tasks pass. Discovers zero `*.live.test.ts` files.
- `pnpm --filter web test:live` run with this VM's real (prod) Supabase
  credentials present — all 6 files fail immediately with
  `ProdDbGuardError: ... resolved Supabase project is "eigfvribtntbxyjutsma",
  the PRODUCTION project ...`, 0 tests executed in any file (the throw
  happens at module load, before `beforeAll`/`createClient`), proving no DB
  I/O occurs.
- `pnpm typecheck` — clean across all 6 packages.
