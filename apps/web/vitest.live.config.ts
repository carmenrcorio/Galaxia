import { defineConfig } from "vitest/config";

// Opt-in only — run via `pnpm --filter web test:live`, never part of the
// default `pnpm --filter web test` / `turbo run test` pipeline and never
// discovered by vitest.config.ts (which explicitly excludes this glob).
//
// Every file this discovers calls `assertDisposableDbTarget` (see
// apps/web/lib/test-utils/assert-not-prod.ts) before any DB I/O and aborts
// loudly unless ALLOW_LIVE_DB_TESTS_AGAINST names a real disposable
// project. No disposable project exists yet, so today this script is
// expected to abort every time it is run — that is the intended dormant
// state until one is provisioned.
export default defineConfig({
  test: {
    include: ["lib/**/*.live.test.ts"],
    environment: "node",
  },
});
