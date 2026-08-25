import { afterEach, describe, expect, it } from "vitest";
import { ProdDbGuardError, assertDisposableDbTarget } from "./assert-not-prod";

const PROD_URL = "https://eigfvribtntbxyjutsma.supabase.co";
const DISPOSABLE_URL = "https://abcdefghijklmnopqrst.supabase.co";

describe("assertDisposableDbTarget", () => {
  afterEach(() => {
    delete process.env.ALLOW_LIVE_DB_TESTS_AGAINST;
  });

  it("throws when the URL is empty/undefined/null", () => {
    expect(() => assertDisposableDbTarget("")).toThrow(ProdDbGuardError);
    expect(() => assertDisposableDbTarget(undefined)).toThrow(ProdDbGuardError);
    expect(() => assertDisposableDbTarget(null)).toThrow(ProdDbGuardError);
    expect(() => assertDisposableDbTarget("   ")).toThrow(/no Supabase URL resolved/);
  });

  it("throws when the URL is not a recognizable *.supabase.co project URL", () => {
    expect(() => assertDisposableDbTarget("https://example.com")).toThrow(ProdDbGuardError);
    expect(() => assertDisposableDbTarget("not-a-url")).toThrow(/does not look like/);
  });

  it("throws on the prod project ref even with no opt-in set", () => {
    expect(() => assertDisposableDbTarget(PROD_URL)).toThrow(/PRODUCTION project/);
  });

  it("throws on the prod project ref even when ALLOW_LIVE_DB_TESTS_AGAINST is (wrongly) set to prod", () => {
    process.env.ALLOW_LIVE_DB_TESTS_AGAINST = "eigfvribtntbxyjutsma";
    expect(() => assertDisposableDbTarget(PROD_URL)).toThrow(/PRODUCTION project/);
  });

  it("throws on a disposable-looking ref when ALLOW_LIVE_DB_TESTS_AGAINST is unset", () => {
    expect(() => assertDisposableDbTarget(DISPOSABLE_URL)).toThrow(/ALLOW_LIVE_DB_TESTS_AGAINST is not set/);
  });

  it("throws when ALLOW_LIVE_DB_TESTS_AGAINST is itself the prod ref, even against a disposable target", () => {
    process.env.ALLOW_LIVE_DB_TESTS_AGAINST = "eigfvribtntbxyjutsma";
    expect(() => assertDisposableDbTarget(DISPOSABLE_URL)).toThrow(/ALLOW_LIVE_DB_TESTS_AGAINST is set to the PRODUCTION ref/);
  });

  it("throws when ALLOW_LIVE_DB_TESTS_AGAINST names a different disposable ref than the resolved one", () => {
    process.env.ALLOW_LIVE_DB_TESTS_AGAINST = "someotherref00000000";
    expect(() => assertDisposableDbTarget(DISPOSABLE_URL)).toThrow(/does not match/);
  });

  it("returns the resolved ref when it is disposable and explicitly allow-listed", () => {
    process.env.ALLOW_LIVE_DB_TESTS_AGAINST = "abcdefghijklmnopqrst";
    expect(assertDisposableDbTarget(DISPOSABLE_URL)).toBe("abcdefghijklmnopqrst");
  });

  it("is case-insensitive and tolerant of a trailing slash / surrounding whitespace", () => {
    process.env.ALLOW_LIVE_DB_TESTS_AGAINST = "ABCDEFGHIJKLMNOPQRST";
    expect(assertDisposableDbTarget(`  ${DISPOSABLE_URL}/  `)).toBe("abcdefghijklmnopqrst");
  });
});
