/**
 * Structural backstop for live-DB tests (see `changelog.d/` for the Phase 0
 * diagnosis this closes out). Every live/VERIFY test must call
 * `assertDisposableDbTarget` before constructing any Supabase client or
 * doing any DB I/O.
 *
 * This is deliberately independent of vitest include/exclude globs: even if
 * a live test is ever accidentally collected by the wrong config, or a
 * future test copies this pattern and lands in the default suite, this
 * guard still throws before a single byte reaches a real database unless
 * the resolved project is explicitly allow-listed as disposable.
 *
 * Fails closed: prod creds present with no opt-in -> ABORT (throw), never a
 * silent skip and never a run.
 */

const PROD_PROJECT_REF = "eigfvribtntbxyjutsma";

export class ProdDbGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProdDbGuardError";
  }
}

function projectRefFromUrl(url: string): string | null {
  const match = /^https:\/\/([a-z0-9]+)\.supabase\.co\/?$/i.exec(url.trim());
  return match ? match[1]!.toLowerCase() : null;
}

/**
 * Throws `ProdDbGuardError` unless `url` resolves to a Supabase project that
 * is (a) not empty, (b) not the production project ref, and (c) explicitly
 * named by `ALLOW_LIVE_DB_TESTS_AGAINST` (which itself must never equal the
 * prod ref). Returns the resolved, lowercased project ref on success.
 */
export function assertDisposableDbTarget(url: string | undefined | null): string {
  const resolvedUrl = (url ?? "").trim();
  if (!resolvedUrl) {
    throw new ProdDbGuardError(
      "[assert-not-prod] ABORT: no Supabase URL resolved (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_URL are unset " +
        "or empty). Live-DB tests require an explicit disposable target; refusing to run against nothing."
    );
  }

  const ref = projectRefFromUrl(resolvedUrl);
  if (!ref) {
    throw new ProdDbGuardError(
      `[assert-not-prod] ABORT: "${resolvedUrl}" does not look like a real *.supabase.co project URL. ` +
        "Refusing to run live-DB tests against an unrecognized target."
    );
  }

  if (ref === PROD_PROJECT_REF) {
    throw new ProdDbGuardError(
      `[assert-not-prod] ABORT: resolved Supabase project is "${ref}", the PRODUCTION project. ` +
        "Live-DB tests must NEVER run against prod, under any configuration. Set " +
        "ALLOW_LIVE_DB_TESTS_AGAINST=<disposable-project-ref> to a throwaway/branch project (never the prod " +
        "ref) to opt in once one exists."
    );
  }

  const allow = (process.env.ALLOW_LIVE_DB_TESTS_AGAINST ?? "").trim().toLowerCase();
  if (!allow) {
    throw new ProdDbGuardError(
      "[assert-not-prod] ABORT: ALLOW_LIVE_DB_TESTS_AGAINST is not set. Live-DB tests require an explicit " +
        `opt-in that names the disposable project ref they expect ("${ref}") — refusing to run silently ` +
        "against whatever credentials happen to be in the environment."
    );
  }

  if (allow === PROD_PROJECT_REF) {
    // Defensive: even an explicit opt-in can never name prod, in case a
    // future caller sets this env var to the wrong value by copy-paste.
    throw new ProdDbGuardError(
      `[assert-not-prod] ABORT: ALLOW_LIVE_DB_TESTS_AGAINST is set to the PRODUCTION ref ("${PROD_PROJECT_REF}"). ` +
        "This is never a valid opt-in target; refusing to run."
    );
  }

  if (allow !== ref) {
    throw new ProdDbGuardError(
      `[assert-not-prod] ABORT: resolved Supabase project ref "${ref}" does not match ` +
        `ALLOW_LIVE_DB_TESTS_AGAINST="${allow}". Refusing to run against an un-allow-listed target.`
    );
  }

  return ref;
}
